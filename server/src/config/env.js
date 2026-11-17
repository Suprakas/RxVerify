const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

// Optional: force DNS servers for Node (fixes "querySrv ECONNREFUSED" on some Windows networks).
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}

const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: toInt(process.env.PORT, 5000),
  // Number of proxies in front of the API (Render = 1; Netlify proxy + Render = 2).
  trustProxy: toInt(process.env.TRUST_PROXY, 1),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rxverify',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: toInt(process.env.REFRESH_TOKEN_DAYS, 7),
  cookieSecure: toBool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),

  lockMinutes: toInt(process.env.LOCK_MINUTES, 10),
  lockSweepSeconds: toInt(process.env.LOCK_SWEEP_SECONDS, 60),
  maxUploadMb: toInt(process.env.MAX_UPLOAD_MB, 5),

  storageDriver: process.env.STORAGE_DRIVER || 'local',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'rxverify',
  },

  ai: {
    enabled: toBool(process.env.AI_EXTRACTION_ENABLED, false),
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  },
};

if (env.isProd) {
  const weak = ['dev-access-secret-change-me', 'dev-refresh-secret-change-me'];
  if (weak.includes(env.jwtAccessSecret) || weak.includes(env.jwtRefreshSecret)) {
    throw new Error('Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in production.');
  }
}

module.exports = env;
