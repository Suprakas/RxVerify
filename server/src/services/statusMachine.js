const { STATUS } = require('../constants');
const ApiError = require('../utils/ApiError');

/**
 * Single source of truth for which status changes are legal.
 * Every write path calls assertTransition() before touching the database,
 * and the database update itself filters on the expected current status.
 */
const TRANSITIONS = Object.freeze({
  [STATUS.SUBMITTED]: [STATUS.IN_REVIEW],
  [STATUS.IN_REVIEW]: [STATUS.APPROVED, STATUS.REJECTED, STATUS.NEEDS_INFO, STATUS.SUBMITTED],
  [STATUS.NEEDS_INFO]: [STATUS.SUBMITTED],
  [STATUS.APPROVED]: [],
  [STATUS.REJECTED]: [],
});

const DECISIONS = Object.freeze([STATUS.APPROVED, STATUS.REJECTED, STATUS.NEEDS_INFO]);
const FINAL_STATUSES = Object.freeze([STATUS.APPROVED, STATUS.REJECTED]);

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw ApiError.conflict(`Cannot move a prescription from ${from} to ${to}`, { from, to });
  }
}

function isFinal(status) {
  return FINAL_STATUSES.includes(status);
}

module.exports = { TRANSITIONS, DECISIONS, canTransition, assertTransition, isFinal };
