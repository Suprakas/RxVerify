const { canTransition, assertTransition, isFinal } = require('../../src/services/statusMachine');
const { STATUS } = require('../../src/constants');

describe('status machine', () => {
  test.each([
    [STATUS.SUBMITTED, STATUS.IN_REVIEW],
    [STATUS.IN_REVIEW, STATUS.APPROVED],
    [STATUS.IN_REVIEW, STATUS.REJECTED],
    [STATUS.IN_REVIEW, STATUS.NEEDS_INFO],
    [STATUS.IN_REVIEW, STATUS.SUBMITTED],
    [STATUS.NEEDS_INFO, STATUS.SUBMITTED],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  test.each([
    [STATUS.SUBMITTED, STATUS.APPROVED],
    [STATUS.SUBMITTED, STATUS.REJECTED],
    [STATUS.APPROVED, STATUS.SUBMITTED],
    [STATUS.REJECTED, STATUS.IN_REVIEW],
    [STATUS.NEEDS_INFO, STATUS.APPROVED],
    ['UNKNOWN', STATUS.SUBMITTED],
  ])('blocks %s -> %s with a 409', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(expect.objectContaining({ status: 409 }));
  });

  test('approved and rejected are final', () => {
    expect(isFinal(STATUS.APPROVED)).toBe(true);
    expect(isFinal(STATUS.REJECTED)).toBe(true);
    expect(isFinal(STATUS.NEEDS_INFO)).toBe(false);
  });
});
