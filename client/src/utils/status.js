export const STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_INFO: 'NEEDS_INFO',
});

export const STATUS_LABELS = Object.freeze({
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_INFO: 'Needs info',
});

export const ACTION_LABELS = Object.freeze({
  SUBMITTED: 'Prescription submitted',
  CLAIMED: 'Pharmacist started the review',
  RELEASED: 'Returned to the queue',
  LOCK_EXPIRED: 'Review timed out and returned to the queue',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_INFO: 'More information requested',
  REUPLOADED: 'New file uploaded',
});

export const CUSTOMER_STATUS_HINTS = Object.freeze({
  SUBMITTED: 'Waiting for a pharmacist to pick it up.',
  IN_REVIEW: 'A pharmacist is checking your prescription now.',
  APPROVED: 'Your prescription is verified and ready for fulfilment.',
  REJECTED: 'This prescription could not be accepted. See the reason below.',
  NEEDS_INFO: 'The pharmacist needs something from you. Upload a new file below.',
});

export const ROLE_HOME = Object.freeze({
  customer: '/prescriptions',
  pharmacist: '/queue',
  admin: '/admin',
});
