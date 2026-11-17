const request = require('supertest');
const db = require('../helpers/db');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.disconnect);

const cookieFrom = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('rx_refresh='));

describe('auth', () => {
  const body = { name: 'Carol Customer', email: 'carol@test.dev', password: 'Password123' };

  test('register creates a customer, returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(body).expect(201);
    expect(res.body.user).toMatchObject({ email: 'carol@test.dev', role: 'customer' });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = cookieFrom(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });

  test('register ignores any role sent by the client', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...body, role: 'admin' }).expect(201);
    expect(res.body.user.role).toBe('customer');
  });

  test('duplicate email returns 409', async () => {
    await request(app).post('/api/auth/register').send(body).expect(201);
    const res = await request(app).post('/api/auth/register').send(body).expect(409);
    expect(res.body.details).toHaveProperty('email');
  });

  test('invalid input returns field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'C', email: 'nope', password: 'x' }).expect(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  test('login uses one message for unknown email and wrong password', async () => {
    await request(app).post('/api/auth/register').send(body);
    const wrongPass = await request(app).post('/api/auth/login').send({ email: body.email, password: 'Wrong12345' }).expect(401);
    const noUser = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'Wrong12345' }).expect(401);
    expect(wrongPass.body.message).toBe(noUser.body.message);
  });

  test('refresh rotates the session; logout revokes old refresh tokens', async () => {
    const reg = await request(app).post('/api/auth/register').send(body);
    const cookie = cookieFrom(reg).split(';')[0];

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });

  test('deactivated users cannot log in or refresh', async () => {
    const reg = await request(app).post('/api/auth/register').send(body);
    const cookie = cookieFrom(reg).split(';')[0];
    await User.updateOne({ email: body.email }, { isActive: false, $inc: { tokenVersion: 1 } });
    await request(app).post('/api/auth/login').send({ email: body.email, password: body.password }).expect(403);
    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });

  test('/me needs a token', async () => {
    await request(app).get('/api/auth/me').expect(401);
    const reg = await request(app).post('/api/auth/register').send(body);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}`).expect(200);
    expect(me.body.user.email).toBe(body.email);
  });
});
