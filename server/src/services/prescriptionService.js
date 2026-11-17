const Prescription = require('../models/Prescription');
const AuditLog = require('../models/AuditLog');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { STATUS, ROLES, AUDIT_ACTIONS } = require('../constants');
const { assertTransition } = require('./statusMachine');
const { writeAudit } = require('./audit');
const { getStorage } = require('./storage');
const { emitPrescriptionUpdated } = require('../socket');
const { extractMedicines, isAiEnabled } = require('./ai/extractMedicines');

const lockExpiry = (from = new Date()) => new Date(from.getTime() + env.lockMinutes * 60 * 1000);
const isStaff = (user) => user.role === ROLES.PHARMACIST || user.role === ROLES.ADMIN;

/* ---------- shaping responses ---------- */

function serialize(doc, viewer) {
  const p = doc.toObject ? doc.toObject({ virtuals: false }) : doc;
  const currentFile = p.files && p.files.length ? p.files[p.files.length - 1] : null;
  const now = Date.now();
  const lockActive = p.status === STATUS.IN_REVIEW && p.lockedUntil && new Date(p.lockedUntil).getTime() > now;
  const assignedId = p.assignedTo ? String(p.assignedTo._id || p.assignedTo) : null;

  const base = {
    id: String(p._id),
    patientName: p.patientName,
    doctorName: p.doctorName,
    issueDate: p.issueDate,
    notes: p.notes,
    medicines: p.medicines,
    status: p.status,
    decisionReason: p.decisionReason,
    decidedAt: p.decidedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    fileCount: p.files ? p.files.length : 0,
    currentFile: currentFile
      ? { originalName: currentFile.originalName, mimeType: currentFile.mimeType, size: currentFile.size, uploadedAt: currentFile.uploadedAt }
      : null,
  };

  if (!isStaff(viewer)) return base;

  return {
    ...base,
    customer: p.customer && p.customer.name ? { id: String(p.customer._id), name: p.customer.name, email: p.customer.email } : { id: String(p.customer) },
    assignedTo: p.assignedTo && p.assignedTo.name ? { id: assignedId, name: p.assignedTo.name } : assignedId ? { id: assignedId } : null,
    lockedUntil: p.lockedUntil,
    isLocked: Boolean(lockActive),
    lockedByMe: Boolean(lockActive && assignedId === viewer.id),
    aiExtraction: p.aiExtraction,
  };
}

function paginate(query) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 10));
  return { page, limit, skip: (page - 1) * limit };
}

/* ---------- AI extraction (runs in the background) ---------- */

const pendingExtractions = new Set();

async function runExtraction(prescriptionId) {
  const doc = await Prescription.findById(prescriptionId);
  if (!doc || !doc.files.length) return;
  const file = doc.files[doc.files.length - 1];
  let aiExtraction;
  try {
    const buffer = await getStorage().readBuffer(file.key);
    const result = await extractMedicines({ buffer, mimeType: file.mimeType });
    aiExtraction = { status: 'done', medicines: result.medicines, model: result.model, extractedAt: new Date() };
  } catch (err) {
    aiExtraction = { status: 'failed', medicines: [], error: 'Could not read this prescription automatically', extractedAt: new Date() };
    if (!env.isTest) console.error('AI extraction failed:', err.message); // eslint-disable-line no-console
  }
  // Only the aiExtraction field is written, so a claim or decision made while
  // the model was working is never overwritten. The file key in the filter skips
  // the write if the customer re-uploaded in the meantime.
  const updated = await Prescription.findOneAndUpdate(
    { _id: prescriptionId, 'files.key': file.key, $expr: { $eq: [{ $arrayElemAt: ['$files.key', -1] }, file.key] } },
    { $set: { aiExtraction } },
    { returnDocument: 'after' }
  );
  if (updated) emitPrescriptionUpdated(updated, { aiUpdated: true });
}

function scheduleExtraction(prescriptionId) {
  const job = runExtraction(prescriptionId).finally(() => pendingExtractions.delete(job));
  pendingExtractions.add(job);
  return job;
}

// Lets tests wait for background work to finish.
function flushExtractions() {
  return Promise.allSettled([...pendingExtractions]);
}

/* ---------- customer actions ---------- */

async function createPrescription({ user, data, file }) {
  const key = await getStorage().save(file.buffer, { mimeType: file.mimetype, originalName: file.originalname });
  const aiOn = isAiEnabled();

  const doc = await Prescription.create({
    ...data,
    customer: user.id,
    files: [{ key, originalName: file.originalname, mimeType: file.mimetype, size: file.size }],
    status: STATUS.SUBMITTED,
    aiExtraction: { status: aiOn ? 'pending' : 'disabled' },
  });

  await writeAudit({ prescriptionId: doc._id, actor: user, action: AUDIT_ACTIONS.SUBMITTED, to: STATUS.SUBMITTED });
  emitPrescriptionUpdated(doc);
  if (aiOn) scheduleExtraction(doc._id);
  return serialize(doc, user);
}

async function listMine({ user, query }) {
  const { page, limit, skip } = paginate(query);
  const filter = { customer: user.id };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Prescription.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Prescription.countDocuments(filter),
  ]);
  return { items: items.map((d) => serialize(d, user)), page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}

async function reupload({ user, id, file, notes }) {
  const existing = await Prescription.findOne({ _id: id, customer: user.id });
  if (!existing) throw ApiError.notFound('Prescription not found');
  if (existing.status !== STATUS.NEEDS_INFO) throw ApiError.conflict('You can only re-upload when more information is requested');
  assertTransition(existing.status, STATUS.SUBMITTED);

  const key = await getStorage().save(file.buffer, { mimeType: file.mimetype, originalName: file.originalname });
  const aiOn = isAiEnabled();
  const update = {
    $push: { files: { key, originalName: file.originalname, mimeType: file.mimetype, size: file.size } },
    $set: {
      status: STATUS.SUBMITTED,
      assignedTo: null,
      lockedUntil: null,
      decisionReason: '',
      aiExtraction: { status: aiOn ? 'pending' : 'disabled', medicines: [] },
      ...(typeof notes === 'string' ? { notes } : {}),
    },
  };

  // Status in the filter: if it changed since we read it, nothing is written.
  const doc = await Prescription.findOneAndUpdate({ _id: id, customer: user.id, status: STATUS.NEEDS_INFO }, update, {
    returnDocument: 'after',
  });
  if (!doc) throw ApiError.conflict('This prescription changed in the meantime, please refresh');

  await writeAudit({ prescriptionId: doc._id, actor: user, action: AUDIT_ACTIONS.REUPLOADED, from: STATUS.NEEDS_INFO, to: STATUS.SUBMITTED, note: notes || '' });
  emitPrescriptionUpdated(doc);
  if (aiOn) scheduleExtraction(doc._id);
  return serialize(doc, user);
}

/* ---------- shared reads ---------- */

async function findForViewer(id, user) {
  const filter = isStaff(user) ? { _id: id } : { _id: id, customer: user.id };
  const doc = await Prescription.findOne(filter).populate('customer', 'name email').populate('assignedTo', 'name');
  // Same 404 for "doesn't exist" and "not yours", so ids can't be probed.
  if (!doc) throw ApiError.notFound('Prescription not found');
  return doc;
}

async function getOne({ user, id }) {
  return serialize(await findForViewer(id, user), user);
}

async function openCurrentFile({ user, id }) {
  const doc = await findForViewer(id, user);
  const file = doc.files[doc.files.length - 1];
  if (!file) throw ApiError.notFound('No file uploaded');
  const stream = await getStorage().openStream(file.key);
  return { stream, file };
}

async function getAuditTrail({ user, id }) {
  await findForViewer(id, user);
  const logs = await AuditLog.find({ prescription: id }).sort({ createdAt: 1, _id: 1 }).populate('actor', 'name');
  return logs.map((log) => ({
    id: String(log._id),
    action: log.action,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    note: log.note,
    actorRole: log.actorRole,
    // Customers see the role ("pharmacist"), staff see who it was.
    actorName: isStaff(user) && log.actor ? log.actor.name : null,
    createdAt: log.createdAt,
  }));
}

/* ---------- pharmacist actions ---------- */

async function listQueue({ user, query }) {
  const { page, limit, skip } = paginate(query);
  const now = new Date();
  let filter;
  switch (query.view) {
    case 'mine':
      filter = { status: STATUS.IN_REVIEW, assignedTo: user.id, lockedUntil: { $gt: now } };
      break;
    case 'decided':
      filter = { status: { $in: [STATUS.APPROVED, STATUS.REJECTED, STATUS.NEEDS_INFO] } };
      break;
    case 'all':
      filter = {};
      break;
    default:
      // "open": anything waiting, including reviews whose lock has expired.
      filter = { status: { $in: [STATUS.SUBMITTED, STATUS.IN_REVIEW] } };
  }
  if (query.status && query.view === 'all') filter.status = query.status;

  const sort = query.view === 'decided' ? { updatedAt: -1, _id: -1 } : { createdAt: 1, _id: 1 };
  const [items, total] = await Promise.all([
    Prescription.find(filter).sort(sort).skip(skip).limit(limit).populate('customer', 'name email').populate('assignedTo', 'name'),
    Prescription.countDocuments(filter),
  ]);
  return { items: items.map((d) => serialize(d, user)), page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}

/**
 * Claim = take the review lock. One atomic findOneAndUpdate: the filter only matches
 * if the prescription is free (SUBMITTED) or its previous lock has expired. If two
 * pharmacists click at the same moment, MongoDB applies the updates one after the
 * other; the second no longer matches the filter and gets a 409.
 */
async function claim({ user, id }) {
  const now = new Date();
  const before = await Prescription.findOneAndUpdate(
    {
      _id: id,
      $or: [{ status: STATUS.SUBMITTED }, { status: STATUS.IN_REVIEW, lockedUntil: { $lte: now } }],
    },
    { $set: { status: STATUS.IN_REVIEW, assignedTo: user.id, lockedUntil: lockExpiry(now) } },
    { returnDocument: 'before' }
  );

  if (!before) {
    const current = await Prescription.findById(id);
    if (!current) throw ApiError.notFound('Prescription not found');
    const mine = current.status === STATUS.IN_REVIEW && String(current.assignedTo) === user.id && current.lockedUntil > now;
    if (mine) {
      // Claiming again while you hold the lock just extends it.
      const extended = await Prescription.findOneAndUpdate(
        { _id: id, status: STATUS.IN_REVIEW, assignedTo: user.id },
        { $set: { lockedUntil: lockExpiry(now) } },
        { returnDocument: 'after' }
      );
      return serialize(await extended.populate([{ path: 'customer', select: 'name email' }, { path: 'assignedTo', select: 'name' }]), user);
    }
    if (current.status === STATUS.IN_REVIEW) throw ApiError.conflict('Another pharmacist is already reviewing this prescription');
    throw ApiError.conflict(`This prescription is already ${current.status.toLowerCase().replace('_', ' ')}`);
  }

  if (before.status === STATUS.IN_REVIEW) {
    await writeAudit({ prescriptionId: before._id, action: AUDIT_ACTIONS.LOCK_EXPIRED, from: STATUS.IN_REVIEW, to: STATUS.SUBMITTED, note: 'Previous review lock expired' });
  }
  assertTransition(STATUS.SUBMITTED, STATUS.IN_REVIEW);
  await writeAudit({ prescriptionId: before._id, actor: user, action: AUDIT_ACTIONS.CLAIMED, from: STATUS.SUBMITTED, to: STATUS.IN_REVIEW });

  const after = await findForViewer(id, user);
  emitPrescriptionUpdated(after);
  return serialize(after, user);
}

async function release({ user, id }) {
  const doc = await Prescription.findOneAndUpdate(
    { _id: id, status: STATUS.IN_REVIEW, assignedTo: user.id },
    { $set: { status: STATUS.SUBMITTED, assignedTo: null, lockedUntil: null } },
    { returnDocument: 'after' }
  );
  if (!doc) {
    if (!(await Prescription.exists({ _id: id }))) throw ApiError.notFound('Prescription not found');
    throw ApiError.conflict('You are not reviewing this prescription');
  }
  await writeAudit({ prescriptionId: doc._id, actor: user, action: AUDIT_ACTIONS.RELEASED, from: STATUS.IN_REVIEW, to: STATUS.SUBMITTED });
  emitPrescriptionUpdated(doc);
  return serialize(doc, user);
}

const DECISION_ACTION = {
  [STATUS.APPROVED]: AUDIT_ACTIONS.APPROVED,
  [STATUS.REJECTED]: AUDIT_ACTIONS.REJECTED,
  [STATUS.NEEDS_INFO]: AUDIT_ACTIONS.NEEDS_INFO,
};

/**
 * Decide = only the pharmacist holding a live lock can change the status.
 * Same pattern as claim: the rules are in the update filter, so there is no
 * gap between "check" and "write" for another request to slip into.
 */
async function decide({ user, id, decision, reason = '' }) {
  assertTransition(STATUS.IN_REVIEW, decision);
  const now = new Date();
  const doc = await Prescription.findOneAndUpdate(
    { _id: id, status: STATUS.IN_REVIEW, assignedTo: user.id, lockedUntil: { $gt: now } },
    { $set: { status: decision, decisionReason: reason, decidedAt: now, lockedUntil: null } },
    { returnDocument: 'after' }
  );

  if (!doc) {
    const current = await Prescription.findById(id);
    if (!current) throw ApiError.notFound('Prescription not found');
    if (current.status !== STATUS.IN_REVIEW) throw ApiError.conflict(`This prescription is ${current.status.toLowerCase().replace('_', ' ')}, it cannot be decided now`);
    if (String(current.assignedTo) !== user.id) throw ApiError.conflict('Another pharmacist is reviewing this prescription');
    throw ApiError.conflict('Your review lock expired. Claim it again to continue');
  }

  await writeAudit({ prescriptionId: doc._id, actor: user, action: DECISION_ACTION[decision], from: STATUS.IN_REVIEW, to: decision, note: reason });
  emitPrescriptionUpdated(doc);
  return serialize(await doc.populate([{ path: 'customer', select: 'name email' }, { path: 'assignedTo', select: 'name' }]), user);
}

async function retryExtraction({ user, id }) {
  if (!isAiEnabled()) throw ApiError.badRequest('AI extraction is turned off on this server');
  const doc = await Prescription.findByIdAndUpdate(id, { $set: { 'aiExtraction.status': 'pending' } }, { returnDocument: 'after' });
  if (!doc) throw ApiError.notFound('Prescription not found');
  scheduleExtraction(doc._id);
  return serialize(doc, user);
}

/* ---------- background: expired locks ---------- */

/**
 * Puts reviews whose lock expired back to SUBMITTED so the queue shows them as
 * free. Claim already treats an expired lock as free, so this is for display and
 * the audit trail, not for correctness.
 */
async function sweepExpiredLocks() {
  const now = new Date();
  const expired = await Prescription.find({ status: STATUS.IN_REVIEW, lockedUntil: { $lte: now } }).select('_id');
  let released = 0;
  for (const { _id } of expired) {
    const doc = await Prescription.findOneAndUpdate(
      { _id, status: STATUS.IN_REVIEW, lockedUntil: { $lte: now } },
      { $set: { status: STATUS.SUBMITTED, assignedTo: null, lockedUntil: null } },
      { returnDocument: 'after' }
    );
    if (doc) {
      released += 1;
      await writeAudit({ prescriptionId: doc._id, action: AUDIT_ACTIONS.LOCK_EXPIRED, from: STATUS.IN_REVIEW, to: STATUS.SUBMITTED, note: 'Review lock expired' });
      emitPrescriptionUpdated(doc);
    }
  }
  return released;
}

/* ---------- admin ---------- */

async function getStats() {
  const [byStatus, timing] = await Promise.all([
    Prescription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Prescription.aggregate([
      { $match: { decidedAt: { $ne: null } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$decidedAt', '$createdAt'] } }, decided: { $sum: 1 } } },
    ]),
  ]);
  const counts = Object.fromEntries(Object.values(STATUS).map((s) => [s, 0]));
  byStatus.forEach((row) => {
    counts[row._id] = row.count;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const avgDecisionMinutes = timing[0] ? Math.round(timing[0].avgMs / 60000) : null;
  return { counts, total, avgDecisionMinutes };
}

module.exports = {
  serialize,
  createPrescription,
  listMine,
  reupload,
  getOne,
  openCurrentFile,
  getAuditTrail,
  listQueue,
  claim,
  release,
  decide,
  retryExtraction,
  sweepExpiredLocks,
  getStats,
  flushExtractions,
};
