const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../../utils/ApiError');

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * Development storage: files live in UPLOAD_DIR, outside any static folder,
 * so the only way to read one is through the authorized API route.
 */
function createLocalStorage(uploadDir) {
  const resolveKey = (key) => {
    // Keys are random names we generated; reject anything that tries to walk out of the folder.
    if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key)) throw ApiError.notFound('File not found');
    return path.join(uploadDir, key);
  };

  return {
    name: 'local',

    async save(buffer, { mimeType }) {
      await fsp.mkdir(uploadDir, { recursive: true });
      const key = `${crypto.randomUUID()}${EXTENSIONS[mimeType] || ''}`;
      await fsp.writeFile(path.join(uploadDir, key), buffer);
      return key;
    },

    async openStream(key) {
      const filePath = resolveKey(key);
      try {
        await fsp.access(filePath);
      } catch {
        throw ApiError.notFound('File not found');
      }
      return fs.createReadStream(filePath);
    },

    async readBuffer(key) {
      return fsp.readFile(resolveKey(key));
    },
  };
}

module.exports = { createLocalStorage };
