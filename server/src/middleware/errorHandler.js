const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.CastError) {
    error = ApiError.notFound('Resource not found');
  } else if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    error = ApiError.badRequest('Validation failed', details);
  } else if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    error = ApiError.conflict(`That ${field} is already in use`, { [field]: 'Already in use' });
  } else if (err && err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Invalid JSON body');
  }

  const status = error instanceof ApiError ? error.status : 500;
  if (status >= 500 && !env.isTest) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on our side' : error.message,
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
