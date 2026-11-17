const { createPrescriptionBody, decisionBody, registerBody } = require('../../src/validation/schemas');

describe('createPrescriptionBody', () => {
  const base = {
    patientName: 'Carol',
    doctorName: 'Dr Mehta',
    issueDate: '2026-11-01',
    medicines: JSON.stringify([{ name: 'Metformin', dosage: '500 mg', quantity: '60' }]),
  };

  test('parses medicines sent as JSON text and coerces numbers', () => {
    const result = createPrescriptionBody.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data.medicines[0]).toEqual({ name: 'Metformin', dosage: '500 mg', quantity: 60 });
    expect(result.data.issueDate).toBeInstanceOf(Date);
  });

  test('needs at least one medicine', () => {
    const result = createPrescriptionBody.safeParse({ ...base, medicines: '[]' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['medicines']);
  });

  test('rejects a future issue date', () => {
    const future = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    expect(createPrescriptionBody.safeParse({ ...base, issueDate: future }).success).toBe(false);
  });
});

describe('decisionBody', () => {
  test('approval needs no reason', () => {
    expect(decisionBody.safeParse({ decision: 'APPROVED' }).success).toBe(true);
  });

  test('reject and needs-info need a reason', () => {
    const result = decisionBody.safeParse({ decision: 'REJECTED', reason: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['reason']);
    expect(decisionBody.safeParse({ decision: 'NEEDS_INFO', reason: 'Photo is blurry' }).success).toBe(true);
  });

  test('cannot decide to SUBMITTED or IN_REVIEW', () => {
    expect(decisionBody.safeParse({ decision: 'SUBMITTED', reason: 'whatever' }).success).toBe(false);
  });
});

describe('registerBody', () => {
  test('normalises email and enforces password rules', () => {
    const ok = registerBody.safeParse({ name: 'Carol', email: '  Carol@Example.COM ', password: 'Password123' });
    expect(ok.success).toBe(true);
    expect(ok.data.email).toBe('carol@example.com');
    expect(registerBody.safeParse({ name: 'Carol', email: 'carol@example.com', password: 'short' }).success).toBe(false);
    expect(registerBody.safeParse({ name: 'Carol', email: 'carol@example.com', password: 'nonumbers' }).success).toBe(false);
  });
});
