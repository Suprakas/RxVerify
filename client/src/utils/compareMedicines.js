const normalize = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Lines up what the customer typed with what the AI read from the file.
 * Names match if one contains the other after normalising
 * ("Amoxicillin 500" matches "amoxicillin").
 */
export function compareMedicines(entered = [], extracted = []) {
  const used = new Set();
  const rows = entered.map((med) => {
    const key = normalize(med.name);
    const index = extracted.findIndex((ai, i) => {
      if (used.has(i)) return false;
      const aiKey = normalize(ai.name);
      return aiKey && key && (aiKey.includes(key) || key.includes(aiKey));
    });
    if (index === -1) return { entered: med, extracted: null, result: 'missing' };
    used.add(index);
    const ai = extracted[index];
    const quantityDiffers = ai.quantity != null && Number(ai.quantity) !== Number(med.quantity);
    return { entered: med, extracted: ai, result: quantityDiffers ? 'quantity' : 'match' };
  });

  extracted.forEach((ai, i) => {
    if (!used.has(i)) rows.push({ entered: null, extracted: ai, result: 'extra' });
  });
  return rows;
}

export const COMPARE_LABELS = {
  match: 'Matches',
  quantity: 'Quantity differs',
  missing: 'Not found on file',
  extra: 'Not entered by customer',
};
