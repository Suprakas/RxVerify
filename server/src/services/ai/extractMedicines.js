const OpenAI = require('openai');
const env = require('../../config/env');

const SYSTEM_PROMPT = [
  'You read photos or scans of medical prescriptions.',
  'List only medicines that are clearly written on the prescription.',
  'Never guess or invent a medicine. If a word is unreadable, leave it out.',
  'Use an empty string for an unknown dosage and null for an unknown quantity.',
  'Set confidence to "low" when handwriting is hard to read.',
].join(' ');

// Structured Outputs: the model must return exactly this shape.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    medicines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          dosage: { type: 'string' },
          quantity: { type: ['integer', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['name', 'dosage', 'quantity', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['medicines'],
  additionalProperties: false,
};

let client = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: env.ai.apiKey });
  return client;
}

// Tests inject a fake client so no request ever leaves the machine.
function setAiClient(fake) {
  client = fake;
}

function isAiEnabled() {
  return Boolean(env.ai.enabled && (env.ai.apiKey || client));
}

function buildFileInput(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  if (mimeType === 'application/pdf') {
    return { type: 'input_file', filename: 'prescription.pdf', file_data: `data:application/pdf;base64,${base64}` };
  }
  return { type: 'input_image', image_url: `data:${mimeType};base64,${base64}`, detail: 'high' };
}

function sanitize(medicines) {
  if (!Array.isArray(medicines)) return [];
  return medicines
    .filter((m) => m && typeof m.name === 'string' && m.name.trim())
    .slice(0, 20)
    .map((m) => ({
      name: m.name.trim().slice(0, 120),
      dosage: typeof m.dosage === 'string' ? m.dosage.trim().slice(0, 80) : '',
      quantity: Number.isInteger(m.quantity) && m.quantity > 0 ? Math.min(m.quantity, 1000) : null,
      confidence: ['high', 'medium', 'low'].includes(m.confidence) ? m.confidence : 'low',
    }));
}

/**
 * Sends the prescription to the model and returns suggested medicines.
 * The result is only ever shown to a pharmacist as a cross-check; it never
 * changes the prescription or its status on its own.
 */
async function extractMedicines({ buffer, mimeType }) {
  const response = await getClient().responses.create({
    model: env.ai.model,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'List the medicines on this prescription.' },
          buildFileInput(buffer, mimeType),
        ],
      },
    ],
    text: {
      format: { type: 'json_schema', name: 'prescription_medicines', strict: true, schema: RESPONSE_SCHEMA },
    },
  });

  const parsed = JSON.parse(response.output_text || '{}');
  return { medicines: sanitize(parsed.medicines), model: env.ai.model };
}

module.exports = { extractMedicines, isAiEnabled, setAiClient, sanitize, RESPONSE_SCHEMA };
