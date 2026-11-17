const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const { createApp } = require('./app');
const { initSocket, closeSocket } = require('./socket');
const { sweepExpiredLocks } = require('./services/prescriptionService');

async function start() {
  await mongoose.connect(env.mongoUri);
  await mongoose.syncIndexes();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  const sweeper = setInterval(() => {
    sweepExpiredLocks().catch((err) => console.error('Lock sweep failed:', err.message)); // eslint-disable-line no-console
  }, env.lockSweepSeconds * 1000);

  server.listen(env.port, () => {
    console.log(`RxVerify API listening on port ${env.port}`); // eslint-disable-line no-console
  });

  const shutdown = async () => {
    clearInterval(sweeper);
    closeSocket();
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err); // eslint-disable-line no-console
  process.exit(1);
});
