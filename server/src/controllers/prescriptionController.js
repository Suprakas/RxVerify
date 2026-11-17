const { pipeline } = require('stream/promises');
const service = require('../services/prescriptionService');

async function create(req, res) {
  const prescription = await service.createPrescription({ user: req.user, data: req.body, file: req.file });
  res.status(201).json({ prescription });
}

async function listMine(req, res) {
  res.json(await service.listMine({ user: req.user, query: req.validatedQuery }));
}

async function getOne(req, res) {
  res.json({ prescription: await service.getOne({ user: req.user, id: req.params.id }) });
}

async function getFile(req, res) {
  const { stream, file } = await service.openCurrentFile({ user: req.user, id: req.params.id });
  res.set({
    'Content-Type': file.mimeType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
    // Medical documents: never store in shared caches.
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  await pipeline(stream, res);
}

async function getAudit(req, res) {
  res.json({ entries: await service.getAuditTrail({ user: req.user, id: req.params.id }) });
}

async function reupload(req, res) {
  const prescription = await service.reupload({ user: req.user, id: req.params.id, file: req.file, notes: req.body.notes });
  res.json({ prescription });
}

async function listQueue(req, res) {
  res.json(await service.listQueue({ user: req.user, query: req.validatedQuery }));
}

async function claim(req, res) {
  res.json({ prescription: await service.claim({ user: req.user, id: req.params.id }) });
}

async function release(req, res) {
  res.json({ prescription: await service.release({ user: req.user, id: req.params.id }) });
}

async function decide(req, res) {
  const { decision, reason } = req.body;
  res.json({ prescription: await service.decide({ user: req.user, id: req.params.id, decision, reason }) });
}

async function retryExtraction(req, res) {
  res.status(202).json({ prescription: await service.retryExtraction({ user: req.user, id: req.params.id }) });
}

module.exports = { create, listMine, getOne, getFile, getAudit, reupload, listQueue, claim, release, decide, retryExtraction };
