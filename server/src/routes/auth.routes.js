const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { registerBody, loginBody } = require('../validation/schemas');
const auth = require('../controllers/authController');

const router = Router();

// Slows down password guessing: 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 10,
  // Only failed attempts count, so normal sign-ins never lock anyone out.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' },
});

router.post('/register', authLimiter, validate({ body: registerBody }), auth.register);
router.post('/login', authLimiter, validate({ body: loginBody }), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

module.exports = router;
