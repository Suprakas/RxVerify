const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

async function connect() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), {
    // Fail fast instead of waiting the default 30 s per operation if something is wrong.
    serverSelectionTimeoutMS: 10000,
    // The MongoDB driver loads Node's "os" module with a dynamic import(), which Jest
    // doesn't support by default. Without this the driver sends empty client metadata
    // and the server refuses the connection ("Missing required sub-document 'driver'").
    runtimeAdapters: { os },
  });
  await mongoose.syncIndexes();
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { connect, clear, disconnect };
