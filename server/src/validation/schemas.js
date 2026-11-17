const { z } = require('zod');
const { STATUS } = require('../constants');

const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParams = z.object({ id: objectId });

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

const registerBody = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: emailField,
  password,
});

const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
});

const medicine = z.object({
  name: z.string().trim().min(1, 'Medicine name is required').max(120),
  dosage: z.string().trim().max(80).optional().default(''),
  quantity: z.coerce.number().int('Whole numbers only').min(1, 'At least 1').max(1000).optional().default(1),
});

// Multipart forms send everything as strings, so medicines arrives as JSON text.
const medicinesField = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(medicine).min(1, 'Add at least one medicine').max(20, 'Up to 20 medicines'));

const createPrescriptionBody = z.object({
  patientName: z.string().trim().min(2, 'Enter the patient name').max(80),
  doctorName: z.string().trim().min(2, 'Enter the doctor name').max(80),
  issueDate: z.coerce
    .date({ error: 'Enter a valid date' })
    .refine((d) => d.getTime() <= Date.now(), 'Issue date cannot be in the future'),
  notes: z.string().trim().max(500).optional().default(''),
  medicines: medicinesField,
});

const reuploadBody = z.object({
  notes: z.string().trim().max(500).optional(),
});

const pageQuery = {
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
};

const listMineQuery = z.object({
  ...pageQuery,
  status: z.enum(Object.values(STATUS)).optional(),
});

const queueQuery = z.object({
  ...pageQuery,
  view: z.enum(['open', 'mine', 'decided', 'all']).optional().default('open'),
  status: z.enum(Object.values(STATUS)).optional(),
});

const decisionBody = z
  .object({
    decision: z.enum([STATUS.APPROVED, STATUS.REJECTED, STATUS.NEEDS_INFO], { error: 'Choose a decision' }),
    reason: z.string().trim().max(500).optional().default(''),
  })
  .refine((v) => v.decision === STATUS.APPROVED || v.reason.length >= 5, {
    path: ['reason'],
    message: 'Give a reason (at least 5 characters) so the customer knows what to do',
  });

const createPharmacistBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailField,
  password,
});

const updateUserBody = z.object({
  isActive: z.boolean(),
});

const usersQuery = z.object({
  ...pageQuery,
  role: z.enum(['customer', 'pharmacist', 'admin']).optional(),
});

module.exports = {
  idParams,
  registerBody,
  loginBody,
  createPrescriptionBody,
  reuploadBody,
  listMineQuery,
  queueQuery,
  decisionBody,
  createPharmacistBody,
  updateUserBody,
  usersQuery,
};
