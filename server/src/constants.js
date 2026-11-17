const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  PHARMACIST: 'pharmacist',
  ADMIN: 'admin',
});

const STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_INFO: 'NEEDS_INFO',
});

const AUDIT_ACTIONS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  CLAIMED: 'CLAIMED',
  RELEASED: 'RELEASED',
  LOCK_EXPIRED: 'LOCK_EXPIRED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_INFO: 'NEEDS_INFO',
  REUPLOADED: 'REUPLOADED',
});

const ALLOWED_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

module.exports = { ROLES, STATUS, AUDIT_ACTIONS, ALLOWED_MIME_TYPES };
