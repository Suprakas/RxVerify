const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER, index: true },
    isActive: { type: Boolean, default: true },
    // Bumped on logout / deactivation so every refresh token issued before it stops working.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
