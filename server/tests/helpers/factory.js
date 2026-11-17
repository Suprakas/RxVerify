const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const { signAccessToken } = require('../../src/services/tokens');
const { setStorage } = require('../../src/services/storage');

// A real 1x1 PNG, so the magic-number check passes.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

let counter = 0;

async function createUser(role = 'customer', overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.dev`,
    passwordHash: await bcrypt.hash('Password123', 4),
    role,
    ...overrides,
  });
  return { user, token: signAccessToken(user), id: user._id.toString() };
}

/** In-memory storage driver for tests: nothing touches the disk or the network. */
function useMemoryStorage() {
  const files = new Map();
  setStorage({
    name: 'memory',
    async save(buffer) {
      counter += 1;
      const key = `mem-${counter}`;
      files.set(key, buffer);
      return key;
    },
    async openStream(key) {
      const { Readable } = require('stream');
      return Readable.from([files.get(key)]);
    },
    async readBuffer(key) {
      return files.get(key);
    },
  });
  return files;
}

const validForm = {
  patientName: 'Carol Customer',
  doctorName: 'Dr Mehta',
  issueDate: '2026-11-01',
  notes: 'Monthly refill',
  medicines: JSON.stringify([{ name: 'Metformin', dosage: '500 mg', quantity: 60 }]),
};

function submitPrescription(request, token, fields = validForm, file = PNG_BYTES, filename = 'rx.png') {
  const req = request.post('/api/prescriptions').set('Authorization', `Bearer ${token}`);
  Object.entries(fields).forEach(([k, v]) => req.field(k, v));
  return req.attach('file', file, filename);
}

module.exports = { createUser, useMemoryStorage, submitPrescription, validForm, PNG_BYTES, PDF_BYTES };
