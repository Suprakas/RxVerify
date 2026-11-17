const request = require('supertest');
const db = require('../helpers/db');
const env = require('../../src/config/env');
const { createApp } = require('../../src/app');
const { setAiClient } = require('../../src/services/ai/extractMedicines');
const { flushExtractions } = require('../../src/services/prescriptionService');
const { createUser, useMemoryStorage, submitPrescription } = require('../helpers/factory');

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

let calls;

beforeAll(async () => {
  await db.connect();
  useMemoryStorage();
  env.ai.enabled = true;
});
beforeEach(() => {
  calls = [];
  // Fake OpenAI client: records the request and returns a fixed answer.
  setAiClient({
    responses: {
      create: async (params) => {
        calls.push(params);
        return {
          output_text: JSON.stringify({
            medicines: [{ name: 'Metformin', dosage: '500 mg', quantity: 60, confidence: 'high' }],
          }),
        };
      },
    },
  });
});
afterEach(db.clear);
afterAll(async () => {
  env.ai.enabled = false;
  setAiClient(null);
  await db.disconnect();
});

describe('AI medicine extraction', () => {
  test('runs in the background after upload and is visible only to staff', async () => {
    const customer = await createUser('customer');
    const pharmacist = await createUser('pharmacist');

    const res = await submitPrescription(request(app), customer.token).expect(201);
    const { id } = res.body.prescription;
    await flushExtractions();

    expect(calls).toHaveLength(1);
    const userContent = calls[0].input[1].content;
    expect(userContent[1]).toMatchObject({ type: 'input_image' });
    expect(userContent[1].image_url).toMatch(/^data:image\/png;base64,/);
    expect(calls[0].text.format).toMatchObject({ type: 'json_schema', strict: true });

    const staff = await request(app).get(`/api/prescriptions/${id}`).set(auth(pharmacist.token)).expect(200);
    expect(staff.body.prescription.aiExtraction.status).toBe('done');
    expect(staff.body.prescription.aiExtraction.medicines[0]).toMatchObject({ name: 'Metformin', confidence: 'high' });

    const own = await request(app).get(`/api/prescriptions/${id}`).set(auth(customer.token)).expect(200);
    expect(own.body.prescription.aiExtraction).toBeUndefined();
  });

  test('a failure is recorded without affecting the prescription', async () => {
    setAiClient({ responses: { create: async () => { throw new Error('rate limited'); } } });
    const customer = await createUser('customer');
    const pharmacist = await createUser('pharmacist');
    const res = await submitPrescription(request(app), customer.token).expect(201);
    await flushExtractions();
    const staff = await request(app).get(`/api/prescriptions/${res.body.prescription.id}`).set(auth(pharmacist.token)).expect(200);
    expect(staff.body.prescription.status).toBe('SUBMITTED');
    expect(staff.body.prescription.aiExtraction.status).toBe('failed');
  });

  test('a pharmacist can re-run extraction', async () => {
    const customer = await createUser('customer');
    const pharmacist = await createUser('pharmacist');
    const res = await submitPrescription(request(app), customer.token).expect(201);
    await flushExtractions();
    await request(app).post(`/api/prescriptions/${res.body.prescription.id}/extract`).set(auth(pharmacist.token)).expect(202);
    await flushExtractions();
    expect(calls).toHaveLength(2);
  });
});
