const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');
const {
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} = require('../services/tokens');

const BCRYPT_ROUNDS = 12;

async function issueSession(res, userId) {
  const user = await User.findById(userId).select('+tokenVersion');
  res.cookie(REFRESH_COOKIE, signRefreshToken(user, user.tokenVersion), refreshCookieOptions());
  return { user: user.toPublic(), accessToken: signAccessToken(user) };
}

async function register(req, res) {
  const { name, email, password } = req.body;
  // Public sign-up always creates a customer; staff accounts are created by an admin.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), role: ROLES.CUSTOMER });
  res.status(201).json(await issueSession(res, user._id));
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for "no such user" and "wrong password", so emails can't be probed.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Incorrect email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  res.json(await issueSession(res, user._id));
}

/**
 * Called on page load and whenever an access token expires. The refresh token
 * lives in an httpOnly cookie (JavaScript can't read it), and is rotated on every use.
 */
async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No active session');
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please sign in again');
  }
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || !user.isActive || user.tokenVersion !== payload.v) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw ApiError.unauthorized('Session expired, please sign in again');
  }
  res.json(await issueSession(res, user._id));
}

async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      // Revokes every refresh token issued so far for this user.
      await User.updateOne({ _id: payload.sub }, { $inc: { tokenVersion: 1 } });
    } catch {
      // An invalid cookie is simply cleared.
    }
  }
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.status(204).end();
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized();
  res.json({ user: user.toPublic() });
}

module.exports = { register, login, refresh, logout, me };
