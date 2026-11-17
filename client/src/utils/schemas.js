import { z } from 'zod';

// Kept in line with the server's rules so users see the same messages before they submit.
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(80),
    email,
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const medicineSchema = z.object({
  name: z.string().trim().min(1, 'Enter the medicine name').max(120),
  dosage: z.string().trim().max(80).optional(),
  quantity: z.coerce.number({ error: 'Enter a number' }).int('Whole numbers only').min(1, 'At least 1').max(1000, 'At most 1000'),
});

export const prescriptionSchema = z.object({
  patientName: z.string().trim().min(2, 'Enter the patient name').max(80),
  doctorName: z.string().trim().min(2, 'Enter the doctor name').max(80),
  issueDate: z
    .string()
    .min(1, 'Enter the issue date')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date')
    .refine((v) => new Date(v).getTime() <= Date.now(), 'Issue date cannot be in the future'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters').optional(),
  medicines: z.array(medicineSchema).min(1, 'Add at least one medicine').max(20, 'Up to 20 medicines'),
  file: z.instanceof(File, { error: 'Choose a prescription file' }),
});

export const decisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_INFO'], { error: 'Choose a decision' }),
    reason: z.string().trim().max(500, 'Keep it under 500 characters'),
  })
  .refine((v) => v.decision === 'APPROVED' || v.reason.length >= 5, {
    path: ['reason'],
    message: 'Tell the customer why (at least 5 characters)',
  });

export const pharmacistSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(80),
  email,
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/\d/, 'Include at least one number'),
});

/** Copies { field: message } errors from the API onto react-hook-form fields. */
export function applyServerErrors(details, setError) {
  Object.entries(details || {}).forEach(([field, message]) => {
    setError(field, { type: 'server', message });
  });
}
