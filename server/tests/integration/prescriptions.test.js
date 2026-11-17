const request = require('supertest');
const db = require('../helpers/db');
const { createApp } = require('../../src/app');
const Prescription = require('../../src/models/Prescription');
const AuditLog = require('../../src/models/AuditLog');
const { sweepExpiredLocks } = require('../../src/services/prescriptionService');
const { createUser, useMemoryStorage, submitPrescription, validForm, PNG_BYTES, PDF_BYTES } = require('../helpers/factory');

const app = createApp();
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

let customer;
let otherCustomer;
let pharmacistA;
let pharmacistB;
let admin;

beforeAll(async () => {
  await db.connect();
  useMemoryStorage();
});
beforeEach(async () => {
  customer = await createUser('customer');
  otherCustomer = await createUser('customer');
  pharmacistA = await createUser('pharmacist');
  pharmacistB = await createUser('pharmacist');
  admin = await createUser('admin');
});
afterEach(db.clear);
afterAll(db.disconnect);

async function submitted() {
  const res = await submitPrescription(api(), customer.token).expect(201);
  return res.body.prescription.id;
}

async function claimed(by = pharmacistA) {
  const id = await submitted();
  await api().post(`/api/prescriptions/${id}/claim`).set(auth(by.token)).expect(200);
  return id;
}

describe('upload', () => {
  test('a customer can submit a prescription with a PNG', async () => {
    const res = await submitPrescription(api(), customer.token).expect(201);
    expect(res.body.prescription).toMatchObject({ status: 'SUBMITTED', patientName: 'Carol Customer', fileCount: 1 });
    expect(res.body.prescription.medicines).toEqual([{ name: 'Metformin', dosage: '500 mg', quantity: 60 }]);
    const log = await AuditLog.find({ prescription: res.body.prescription.id });
    expect(log.map((l) => l.action)).toEqual(['SUBMITTED']);
  });

  test('PDFs are accepted', async () => {
    await submitPrescription(api(), customer.token, validForm, PDF_BYTES, 'rx.pdf').expect(201);
  });

  test('a file whose content does not match its type is rejected', async () => {
    const fake = Buffer.from('MZ this is really an executable');
    const res = await submitPrescription(api(), customer.token, validForm, fake, 'rx.png').expect(400);
    expect(res.body.details).toHaveProperty('file');
  });

  test('missing file and invalid fields return 400 with details', async () => {
    const res = await api()
      .post('/api/prescriptions')
      .set(auth(customer.token))
      .field('patientName', '')
      .attach('file', PNG_BYTES, 'rx.png')
      .expect(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['patientName', 'doctorName', 'medicines']));

    const noFile = await api().post('/api/prescriptions').set(auth(customer.token)).field('patientName', 'x').expect(400);
    expect(noFile.body.details).toHaveProperty('file');
  });

  test('pharmacists cannot submit', async () => {
    await submitPrescription(api(), pharmacistA.token).expect(403);
  });
});

describe('access control', () => {
  test('a customer only sees their own prescriptions; others get 404 not 403', async () => {
    const id = await submitted();
    await api().get(`/api/prescriptions/${id}`).set(auth(customer.token)).expect(200);
    await api().get(`/api/prescriptions/${id}`).set(auth(otherCustomer.token)).expect(404);
    await api().get(`/api/prescriptions/${id}/file`).set(auth(otherCustomer.token)).expect(404);
    const mine = await api().get('/api/prescriptions/mine').set(auth(otherCustomer.token)).expect(200);
    expect(mine.body.total).toBe(0);
  });

  test('the file is streamed only to allowed users, never cached', async () => {
    const id = await submitted();
    const res = await api().get(`/api/prescriptions/${id}/file`).set(auth(pharmacistA.token)).expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe('private, no-store');
    await api().get(`/api/prescriptions/${id}/file`).expect(401);
  });

  test('customers cannot use the queue or decide', async () => {
    const id = await submitted();
    await api().get('/api/prescriptions/queue').set(auth(customer.token)).expect(403);
    await api().post(`/api/prescriptions/${id}/claim`).set(auth(customer.token)).expect(403);
    await api().patch(`/api/prescriptions/${id}/status`).set(auth(customer.token)).send({ decision: 'APPROVED' }).expect(403);
  });

  test('admins can view the queue but cannot claim', async () => {
    const id = await submitted();
    await api().get('/api/prescriptions/queue').set(auth(admin.token)).expect(200);
    await api().post(`/api/prescriptions/${id}/claim`).set(auth(admin.token)).expect(403);
  });

  test('customer view hides staff-only fields', async () => {
    const id = await claimed();
    const res = await api().get(`/api/prescriptions/${id}`).set(auth(customer.token)).expect(200);
    expect(res.body.prescription.assignedTo).toBeUndefined();
    expect(res.body.prescription.aiExtraction).toBeUndefined();
  });
});

describe('claim and lock', () => {
  test('claiming moves the prescription to IN_REVIEW and locks it', async () => {
    const id = await submitted();
    const res = await api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistA.token)).expect(200);
    expect(res.body.prescription).toMatchObject({ status: 'IN_REVIEW', isLocked: true, lockedByMe: true });
  });

  test('two pharmacists claiming at the same moment: exactly one wins', async () => {
    const id = await submitted();
    const results = await Promise.all([
      api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistA.token)),
      api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistB.token)),
    ]);
    const codes = results.map((r) => r.status).sort();
    expect(codes).toEqual([200, 409]);
    const claims = await AuditLog.countDocuments({ prescription: id, action: 'CLAIMED' });
    expect(claims).toBe(1);
  });

  test('ten concurrent claims still produce exactly one owner', async () => {
    const id = await submitted();
    const pharmacists = await Promise.all(Array.from({ length: 10 }, () => createUser('pharmacist')));
    const results = await Promise.all(pharmacists.map((p) => api().post(`/api/prescriptions/${id}/claim`).set(auth(p.token))));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(9);
  });

  test('claiming again while holding the lock extends it', async () => {
    const id = await claimed();
    const before = (await Prescription.findById(id)).lockedUntil;
    await new Promise((r) => setTimeout(r, 20));
    await api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistA.token)).expect(200);
    const after = (await Prescription.findById(id)).lockedUntil;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  test('an expired lock can be taken over, and the audit shows why', async () => {
    const id = await claimed(pharmacistA);
    await Prescription.updateOne({ _id: id }, { lockedUntil: new Date(Date.now() - 1000) });
    const res = await api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistB.token)).expect(200);
    expect(res.body.prescription.lockedByMe).toBe(true);
    const actions = (await AuditLog.find({ prescription: id }).sort({ createdAt: 1, _id: 1 })).map((l) => l.action);
    expect(actions).toEqual(['SUBMITTED', 'CLAIMED', 'LOCK_EXPIRED', 'CLAIMED']);
  });

  test('the sweeper returns expired reviews to the queue', async () => {
    const id = await claimed();
    await Prescription.updateOne({ _id: id }, { lockedUntil: new Date(Date.now() - 1000) });
    expect(await sweepExpiredLocks()).toBe(1);
    const doc = await Prescription.findById(id);
    expect(doc.status).toBe('SUBMITTED');
    expect(doc.assignedTo).toBeNull();
    expect(await sweepExpiredLocks()).toBe(0);
  });

  test('a pharmacist can release their own claim but not someone else\'s', async () => {
    const id = await claimed(pharmacistA);
    await api().post(`/api/prescriptions/${id}/release`).set(auth(pharmacistB.token)).expect(409);
    const res = await api().post(`/api/prescriptions/${id}/release`).set(auth(pharmacistA.token)).expect(200);
    expect(res.body.prescription.status).toBe('SUBMITTED');
  });
});

describe('decisions', () => {
  test('the lock holder can approve', async () => {
    const id = await claimed();
    const res = await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistA.token)).send({ decision: 'APPROVED' }).expect(200);
    expect(res.body.prescription.status).toBe('APPROVED');
    expect(res.body.prescription.decidedAt).toBeTruthy();
  });

  test('reject needs a reason', async () => {
    const id = await claimed();
    await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistA.token)).send({ decision: 'REJECTED' }).expect(400);
    await api()
      .patch(`/api/prescriptions/${id}/status`)
      .set(auth(pharmacistA.token))
      .send({ decision: 'REJECTED', reason: 'Prescription is older than allowed' })
      .expect(200);
  });

  test('cannot decide without claiming first', async () => {
    const id = await submitted();
    await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistA.token)).send({ decision: 'APPROVED' }).expect(409);
  });

  test('another pharmacist cannot decide on a locked prescription', async () => {
    const id = await claimed(pharmacistA);
    const res = await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistB.token)).send({ decision: 'APPROVED' }).expect(409);
    expect(res.body.message).toMatch(/another pharmacist/i);
  });

  test('cannot decide after your lock expired', async () => {
    const id = await claimed(pharmacistA);
    await Prescription.updateOne({ _id: id }, { lockedUntil: new Date(Date.now() - 1000) });
    const res = await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistA.token)).send({ decision: 'APPROVED' }).expect(409);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('a final decision cannot be changed', async () => {
    const id = await claimed();
    await api().patch(`/api/prescriptions/${id}/status`).set(auth(pharmacistA.token)).send({ decision: 'APPROVED' }).expect(200);
    await api().post(`/api/prescriptions/${id}/claim`).set(auth(pharmacistB.token)).expect(409);
    await api()
      .patch(`/api/prescriptions/${id}/status`)
      .set(auth(pharmacistA.token))
      .send({ decision: 'REJECTED', reason: 'Changed my mind' })
      .expect(409);
  });
});

describe('needs info and re-upload', () => {
  async function needsInfo() {
    const id = await claimed();
    await api()
      .patch(`/api/prescriptions/${id}/status`)
      .set(auth(pharmacistA.token))
      .send({ decision: 'NEEDS_INFO', reason: 'The photo is blurry, please upload a clearer one' })
      .expect(200);
    return id;
  }

  test('the customer can re-upload, which sends it back to the queue', async () => {
    const id = await needsInfo();
    const res = await api()
      .put(`/api/prescriptions/${id}/file`)
      .set(auth(customer.token))
      .field('notes', 'Clearer photo attached')
      .attach('file', PNG_BYTES, 'clear.png')
      .expect(200);
    expect(res.body.prescription).toMatchObject({ status: 'SUBMITTED', fileCount: 2, notes: 'Clearer photo attached' });
    const actions = (await AuditLog.find({ prescription: id }).sort({ createdAt: 1, _id: 1 })).map((l) => l.action);
    expect(actions).toEqual(['SUBMITTED', 'CLAIMED', 'NEEDS_INFO', 'REUPLOADED']);
  });

  test('re-upload is blocked in any other status and for other customers', async () => {
    const id = await submitted();
    await api().put(`/api/prescriptions/${id}/file`).set(auth(customer.token)).attach('file', PNG_BYTES, 'x.png').expect(409);
    const id2 = await needsInfo();
    await api().put(`/api/prescriptions/${id2}/file`).set(auth(otherCustomer.token)).attach('file', PNG_BYTES, 'x.png').expect(404);
  });
});

describe('queue and audit', () => {
  test('the open queue is oldest first and includes locked reviews', async () => {
    const first = await submitted();
    const second = await submitted();
    await api().post(`/api/prescriptions/${second}/claim`).set(auth(pharmacistB.token)).expect(200);
    const res = await api().get('/api/prescriptions/queue').set(auth(pharmacistA.token)).expect(200);
    expect(res.body.items.map((p) => p.id)).toEqual([first, second]);
    expect(res.body.items[1]).toMatchObject({ isLocked: true, lockedByMe: false });
  });

  test('"mine" shows only my active reviews', async () => {
    const mine = await claimed(pharmacistA);
    await claimed(pharmacistB);
    const res = await api().get('/api/prescriptions/queue?view=mine').set(auth(pharmacistA.token)).expect(200);
    expect(res.body.items.map((p) => p.id)).toEqual([mine]);
  });

  test('customers see roles in the audit trail, staff see names', async () => {
    const id = await claimed(pharmacistA);
    const asCustomer = await api().get(`/api/prescriptions/${id}/audit`).set(auth(customer.token)).expect(200);
    expect(asCustomer.body.entries[1]).toMatchObject({ action: 'CLAIMED', actorRole: 'pharmacist', actorName: null });
    const asStaff = await api().get(`/api/prescriptions/${id}/audit`).set(auth(admin.token)).expect(200);
    expect(asStaff.body.entries[1].actorName).toBe(pharmacistA.user.name);
  });

  test('malformed ids are rejected before reaching the database', async () => {
    await api().get('/api/prescriptions/not-an-id').set(auth(customer.token)).expect(400);
  });
});
