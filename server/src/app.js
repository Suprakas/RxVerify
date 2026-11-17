const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const prescriptionRoutes = require('./routes/prescriptions.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { isAiEnabled } = require('./services/ai/extractMedicines');

function createApp() {
  const app = express();

  // Proxies in front of the API, so req.ip (used by the rate limiter) is the real client IP.
  app.set('trust proxy', env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin requests and tools like curl send no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/config', (_req, res) =>
    res.json({ aiEnabled: isAiEnabled(), maxUploadMb: env.maxUploadMb, lockMinutes: env.lockMinutes })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
