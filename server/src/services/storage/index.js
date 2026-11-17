const env = require('../../config/env');
const { createLocalStorage } = require('./localStorage');
const { createCloudinaryStorage } = require('./cloudinaryStorage');

let storage;

/** Same interface for every driver: save(buffer, meta) -> key, openStream(key), readBuffer(key). */
function getStorage() {
  if (!storage) {
    storage = env.storageDriver === 'cloudinary' ? createCloudinaryStorage(env.cloudinary) : createLocalStorage(env.uploadDir);
  }
  return storage;
}

// Tests swap in their own driver.
function setStorage(custom) {
  storage = custom;
}

module.exports = { getStorage, setStorage };
