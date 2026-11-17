/**
 * HTTP-layer checks that never reach the database: routing, auth guards,
 * role guards, validation and upload checks all reject before any query runs.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');

const app = createApp();
const tokenFor = (role) => jwt.sign({ sub: '64b000000000000000000001', role, name: role }, process.env.JWT_ACCESS_SECRET);
const auth = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` });

describe('HTTP layer', () => {
  test('health and public config', async () => {
    await request(app).get('/api/health').expect(200, { ok: true });
    const config = await request(app).get('/api/config').expect(200);
    expect(config.body).toEqual({ aiEnabled: false, maxUploadMb: 5, lockMinutes: 10 });
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('unknown routes return JSON 404', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('protected routes need a token', async () => {
    await request(app).get('/api/prescriptions/mine').expect(401);
    await request(app).get('/api/admin/stats').expect(401);
  });

  test('role guards return 403 before any database work', async () => {
    await request(app).get('/api/prescriptions/queue').set(auth('customer')).expect(403);
    await request(app).get('/api/prescriptions/mine').set(auth('pharmacist')).expect(403);
    await request(app).get('/api/admin/stats').set(auth('pharmacist')).expect(403);
  });

  test('invalid ids and bodies return 400 with field details', async () => {
    await request(app).get('/api/prescriptions/abc').set(auth('customer')).expect(400);
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' }).expect(400);
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('password');
  });

  test('uploads are checked for type and content', async () => {
    const wrongType = await request(app)
      .post('/api/prescriptions')
      .set(auth('customer'))
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400);
    expect(wrongType.body.details).toHaveProperty('file');

    const renamed = await request(app)
      .post('/api/prescriptions')
      .set(auth('customer'))
      .attach('file', Buffer.from('MZ fake'), { filename: 'rx.png', contentType: 'image/png' })
      .expect(400);
    expect(renamed.body.message).toMatch(/does not match/i);
  });

  test('broken JSON bodies return 400, not 500', async () => {
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":').expect(400);
  });
});
