const jwt = require('jsonwebtoken');
const { requireAuth, requireRole } = require('../../src/middleware/auth');

const run = (mw, req) =>
  new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });

const reqWith = (header) => ({ get: (name) => (name.toLowerCase() === 'authorization' ? header : undefined) });

describe('requireAuth', () => {
  test('accepts a valid bearer token and sets req.user', async () => {
    const token = jwt.sign({ sub: 'u1', role: 'customer', name: 'Carol' }, process.env.JWT_ACCESS_SECRET);
    const req = reqWith(`Bearer ${token}`);
    expect(await run(requireAuth, req)).toBeUndefined();
    expect(req.user).toEqual({ id: 'u1', role: 'customer', name: 'Carol' });
  });

  test('rejects a missing, malformed or forged token with 401', async () => {
    const forged = jwt.sign({ sub: 'u1', role: 'admin' }, 'some-other-secret');
    for (const header of [undefined, 'Token abc', 'Bearer', `Bearer ${forged}`]) {
      expect(await run(requireAuth, reqWith(header))).toEqual(expect.objectContaining({ status: 401 }));
    }
  });

  test('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 'u1', role: 'customer', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_ACCESS_SECRET);
    expect(await run(requireAuth, reqWith(`Bearer ${expired}`))).toEqual(expect.objectContaining({ status: 401 }));
  });
});

describe('requireRole', () => {
  test('lets listed roles through and blocks others with 403', async () => {
    const guard = requireRole('pharmacist', 'admin');
    expect(await run(guard, { user: { role: 'pharmacist' } })).toBeUndefined();
    expect(await run(guard, { user: { role: 'customer' } })).toEqual(expect.objectContaining({ status: 403 }));
    expect(await run(guard, {})).toEqual(expect.objectContaining({ status: 401 }));
  });
});
