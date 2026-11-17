import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, mockApi, users, signedInState } from '../../test/utils';

const reviewing = {
  id: 'rx1',
  patientName: 'Carol Customer',
  doctorName: 'Dr Mehta',
  issueDate: '2026-11-01',
  medicines: [{ name: 'Metformin', dosage: '500 mg', quantity: 60 }],
  status: 'IN_REVIEW',
  createdAt: '2026-11-15T10:00:00.000Z',
  customer: { id: 'c1', name: 'Carol Customer' },
  assignedTo: { id: 'p1', name: 'Priya Pharmacist' },
  isLocked: true,
  lockedByMe: true,
  lockedUntil: new Date(Date.now() + 10 * 60000).toISOString(),
  fileCount: 1,
  currentFile: { originalName: 'rx.png', mimeType: 'image/png' },
  aiExtraction: {
    status: 'done',
    medicines: [{ name: 'Metformin', dosage: '500 mg', quantity: 30, confidence: 'high' }],
  },
};

function setup(extra = {}) {
  const calls = mockApi({
    'GET /api/prescriptions/rx1': () => [200, { prescription: reviewing }],
    'GET /api/prescriptions/rx1/audit': () => [200, { entries: [] }],
    'GET /api/prescriptions/rx1/file': () => [200, {}],
    'GET /api/prescriptions/queue': () => [200, { items: [], page: 1, limit: 10, total: 0, totalPages: 1 }],
    ...extra,
  });
  const utils = renderApp('/queue/rx1', { preloadedState: signedInState(users.pharmacist) });
  return { calls, ...utils };
}

describe('review decision', () => {
  test('reject needs a reason before anything is sent', async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByLabelText(/reject/i));
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }));
    expect(await screen.findByText(/tell the customer why/i)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'PATCH /api/prescriptions/rx1/status')).toBe(false);
  });

  test('sends the decision and returns to the queue', async () => {
    let sent;
    const { router } = setup({
      'PATCH /api/prescriptions/rx1/status': async ({ request }) => {
        sent = await request.json();
        return [200, { prescription: { ...reviewing, status: 'NEEDS_INFO' } }];
      },
    });
    await userEvent.click(await screen.findByLabelText(/ask for more info/i));
    await userEvent.type(screen.getByLabelText(/reason for the customer/i), 'Photo is blurry, please re-upload');
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }));
    expect(sent).toEqual({ decision: 'NEEDS_INFO', reason: 'Photo is blurry, please re-upload' });
    expect(await screen.findByText(/sent back to the customer/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/queue');
  });

  test('the AI cross-check flags a quantity mismatch', async () => {
    setup();
    expect(await screen.findByText('Quantity differs')).toBeInTheDocument();
    expect(screen.getByText(/suggestions only/i)).toBeInTheDocument();
  });
});
