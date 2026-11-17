const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/tokens');

/**
 * Reads "Authorization: Bearer <access token>" and puts { id, role, name } on req.user.
 * The access token is short-lived, so a deactivated user is locked out within minutes
 * and their refresh token is already revoked (see admin controller).
 */
function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized());
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch {
    return next(ApiError.unauthorized('Session expired, please sign in again'));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
}

module.exports = { requireAuth, requireRole };
