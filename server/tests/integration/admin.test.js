const request = require('supertest');
const db = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser, useMemoryStorage, submitPrescription } = require('../helpers/factory');

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await db.connect();
  useMemoryStorage();
});
afterEach(db.clear);
afterAll(db.disconnect);

describe('admin', () => {
  test('only admins can use admin routes', async () => {
    const pharmacist = await createUser('pharmacist');
    await request(app).get('/api/admin/stats').set(auth(pharmacist.token)).expect(403);
  });

  test('creates pharmacists who can then log in', async () => {
    const admin = await createUser('admin');
    const res = await request(app)
      .post('/api/admin/pharmacists')
      .set(auth(admin.token))
      .send({ name: 'New Pharmacist', email: 'new@test.dev', password: 'Password123' })
      .expect(201);
    expect(res.body.user.role).toBe('pharmacist');
    await request(app).post('/api/auth/login').send({ email: 'new@test.dev', password: 'Password123' }).expect(200);
  });

  test('deactivates a user but not themselves', async () => {
    const admin = await createUser('admin');
    const pharmacist = await createUser('pharmacist');
    const res = await request(app).patch(`/api/admin/users/${pharmacist.id}`).set(auth(admin.token)).send({ isActive: false }).expect(200);
    expect(res.body.user.isActive).toBe(false);
    await request(app).patch(`/api/admin/users/${admin.id}`).set(auth(admin.token)).send({ isActive: false }).expect(400);
  });

  test('stats count prescriptions by status', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');
    await submitPrescription(request(app), customer.token).expect(201);
    await submitPrescription(request(app), customer.token).expect(201);
    const res = await request(app).get('/api/admin/stats').set(auth(admin.token)).expect(200);
    expect(res.body.counts.SUBMITTED).toBe(2);
    expect(res.body.total).toBe(2);
    expect(res.body.aiEnabled).toBe(false);
  });

  test('lists users with a role filter', async () => {
    const admin = await createUser('admin');
    await createUser('pharmacist');
    await createUser('customer');
    const res = await request(app).get('/api/admin/users?role=pharmacist').set(auth(admin.token)).expect(200);
    expect(res.body.items.every((u) => u.role === 'pharmacist')).toBe(true);
    expect(res.body.total).toBe(1);
  });
});
