const { sanitize, RESPONSE_SCHEMA } = require('../../src/services/ai/extractMedicines');

describe('AI output sanitizing', () => {
  test('drops empty names, trims text and caps values', () => {
    const result = sanitize([
      { name: '  Amoxicillin ', dosage: ' 250 mg ', quantity: 21, confidence: 'high' },
      { name: '', dosage: '10 mg', quantity: 1, confidence: 'high' },
      { name: 'Paracetamol', dosage: null, quantity: 5000, confidence: 'certain' },
      { name: 'Cetirizine', dosage: '10 mg', quantity: -2, confidence: 'low' },
    ]);
    expect(result).toEqual([
      { name: 'Amoxicillin', dosage: '250 mg', quantity: 21, confidence: 'high' },
      { name: 'Paracetamol', dosage: '', quantity: 1000, confidence: 'low' },
      { name: 'Cetirizine', dosage: '10 mg', quantity: null, confidence: 'low' },
    ]);
  });

  test('handles garbage input', () => {
    expect(sanitize(undefined)).toEqual([]);
    expect(sanitize('nope')).toEqual([]);
  });

  test('schema is strict so the model cannot add extra fields', () => {
    expect(RESPONSE_SCHEMA.additionalProperties).toBe(false);
    expect(RESPONSE_SCHEMA.properties.medicines.items.additionalProperties).toBe(false);
  });
});
