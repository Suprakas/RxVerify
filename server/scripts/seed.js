/* Creates demo accounts. Safe to run more than once: existing emails are skipped. */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const User = require('../src/models/User');
const { ROLES } = require('../src/constants');

const password = process.env.SEED_PASSWORD || 'Password123';

const accounts = [
  { name: 'Asha Admin', email: 'admin@rxverify.dev', role: ROLES.ADMIN },
  { name: 'Priya Pharmacist', email: 'priya@rxverify.dev', role: ROLES.PHARMACIST },
  { name: 'Rahul Pharmacist', email: 'rahul@rxverify.dev', role: ROLES.PHARMACIST },
  { name: 'Carol Customer', email: 'carol@rxverify.dev', role: ROLES.CUSTOMER },
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  const passwordHash = await bcrypt.hash(password, 12);
  for (const account of accounts) {
    const exists = await User.exists({ email: account.email });
    if (exists) {
      console.log(`skip    ${account.email}`); // eslint-disable-line no-console
    } else {
      await User.create({ ...account, passwordHash });
      console.log(`created ${account.email} (${account.role})`); // eslint-disable-line no-console
    }
  }
  console.log(`\nAll demo accounts use the password: ${password}`); // eslint-disable-line no-console
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1);
});
