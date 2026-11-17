const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ALLOWED_MIME_TYPES } = require('../constants');
const { detectMimeType } = require('../utils/fileSignature');

// Files stay in memory just long enough to be checked and handed to the storage driver.
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP or PDF files are allowed', { file: 'Unsupported file type' }));
    }
    return cb(null, true);
  },
});

/**
 * Single "file" field upload, then a magic-number check on the bytes:
 * the browser's declared type is only a hint, the content must match.
 */
function prescriptionFile({ required = true } = {}) {
  const single = multerUpload.single('file');
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest(`File must be ${env.maxUploadMb} MB or smaller`, { file: 'File too large' }));
        }
        return next(err);
      }
      if (!req.file) {
        return required ? next(ApiError.badRequest('A prescription file is required', { file: 'Required' })) : next();
      }
      const detected = detectMimeType(req.file.buffer);
      if (!detected || detected !== req.file.mimetype) {
        return next(ApiError.badRequest('The file content does not match its type', { file: 'File looks corrupted or renamed' }));
      }
      return next();
    });
  };
}

module.exports = { prescriptionFile };
