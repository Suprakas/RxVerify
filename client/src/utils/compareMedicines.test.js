import { compareMedicines } from './compareMedicines';

describe('compareMedicines', () => {
  test('matches names loosely and flags quantity differences', () => {
    const rows = compareMedicines(
      [
        { name: 'Amoxicillin', dosage: '500 mg', quantity: 21 },
        { name: 'Paracetamol', dosage: '650 mg', quantity: 10 },
      ],
      [
        { name: 'AMOXICILLIN 500', dosage: '500mg', quantity: 21, confidence: 'high' },
        { name: 'Paracetamol', dosage: '650 mg', quantity: 15, confidence: 'medium' },
      ]
    );
    expect(rows.map((r) => r.result)).toEqual(['match', 'quantity']);
  });

  test('reports entries missing from the file and extra items on the file', () => {
    const rows = compareMedicines([{ name: 'Cetirizine', quantity: 5 }], [{ name: 'Ibuprofen', quantity: null, confidence: 'low' }]);
    expect(rows.map((r) => r.result)).toEqual(['missing', 'extra']);
  });

  test('an unknown AI quantity is not treated as a mismatch', () => {
    const rows = compareMedicines([{ name: 'Metformin', quantity: 60 }], [{ name: 'Metformin', quantity: null }]);
    expect(rows[0].result).toBe('match');
  });

  test('each AI row is used once', () => {
    const rows = compareMedicines(
      [
        { name: 'Vitamin D', quantity: 1 },
        { name: 'Vitamin D', quantity: 1 },
      ],
      [{ name: 'Vitamin D', quantity: 1 }]
    );
    expect(rows.map((r) => r.result)).toEqual(['match', 'missing']);
  });
});
