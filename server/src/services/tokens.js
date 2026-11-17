const jwt = require('jsonwebtoken');
const env = require('../config/env');

const REFRESH_COOKIE = 'rx_refresh';

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, name: user.name }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

function signRefreshToken(user, tokenVersion) {
  return jwt.sign({ sub: user._id.toString(), v: tokenVersion }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenDays}d`,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}

module.exports = {
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshCookieOptions,
};
