const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');
const { getStats } = require('../services/prescriptionService');
const { isAiEnabled } = require('../services/ai/extractMedicines');

async function listUsers(req, res) {
  const { page, limit, role } = req.validatedQuery;
  const filter = role ? { role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ items: users.map((u) => u.toPublic()), page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
}

async function createPharmacist(req, res) {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: ROLES.PHARMACIST });
  res.status(201).json({ user: user.toPublic() });
}

async function updateUser(req, res) {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot deactivate your own account');
  const update = { $set: { isActive: req.body.isActive } };
  // Deactivating revokes all refresh tokens immediately.
  if (!req.body.isActive) update.$inc = { tokenVersion: 1 };
  const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user: user.toPublic() });
}

async function stats(_req, res) {
  res.json({ ...(await getStats()), aiEnabled: isAiEnabled() });
}

module.exports = { listUsers, createPharmacist, updateUser, stats };
