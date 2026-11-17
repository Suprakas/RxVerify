const AuditLog = require('../models/AuditLog');

function writeAudit({ prescriptionId, actor = null, action, from = null, to, note = '' }) {
  return AuditLog.create({
    prescription: prescriptionId,
    actor: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'system',
    action,
    fromStatus: from,
    toStatus: to,
    note,
  });
}

module.exports = { writeAudit };
