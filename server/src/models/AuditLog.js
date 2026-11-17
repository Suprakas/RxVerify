const mongoose = require('mongoose');
const { AUDIT_ACTIONS, STATUS } = require('../constants');

const auditLogSchema = new mongoose.Schema(
  {
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true, index: true },
    // null actor = the system (for example, an expired lock).
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: 'system' },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true },
    fromStatus: { type: String, enum: [...Object.values(STATUS), null], default: null },
    toStatus: { type: String, enum: Object.values(STATUS), required: true },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ prescription: 1, createdAt: 1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
