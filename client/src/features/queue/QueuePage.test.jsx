import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, mockApi, users, signedInState } from '../../test/utils';

const rx = (overrides) => ({
  id: 'rx1',
  patientName: 'Carol Customer',
  doctorName: 'Dr Mehta',
  issueDate: '2026-11-01',
  medicines: [{ name: 'Metformin', dosage: '500 mg', quantity: 60 }],
  status: 'SUBMITTED',
  createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  customer: { id: 'c1', name: 'Carol Customer' },
  assignedTo: null,
  isLocked: false,
  lockedByMe: false,
  fileCount: 1,
  currentFile: { originalName: 'rx.png', mimeType: 'image/png' },
  aiExtraction: { status: 'disabled' },
  ...overrides,
});

const page = (items) => ({ items, page: 1, limit: 10, total: items.length, totalPages: 1 });

describe('QueuePage', () => {
  test('shows who holds each lock and only offers Claim when it is free', async () => {
    mockApi({
      'GET /api/prescriptions/queue': () => [
        200,
        page([
          rx({ id: 'free', patientName: 'Free Patient' }),
          rx({ id: 'taken', patientName: 'Taken Patient', status: 'IN_REVIEW', isLocked: true, assignedTo: { id: 'p2', name: 'Rahul' } }),
        ]),
      ],
    });
    renderApp('/queue', { preloadedState: signedInState(users.pharmacist) });

    const freeRow = (await screen.findByRole('link', { name: 'Free Patient' })).closest('tr');
    const takenRow = screen.getByRole('link', { name: 'Taken Patient' }).closest('tr');
    expect(within(freeRow).getByRole('button', { name: /claim/i })).toBeInTheDocument();
    expect(within(takenRow).queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
    expect(within(takenRow).getByText('by Rahul')).toBeInTheDocument();
  });

  test('a lost race (409) shows the server message instead of opening the review', async () => {
    mockApi({
      'GET /api/prescriptions/queue': () => [200, page([rx()])],
      'POST /api/prescriptions/rx1/claim': () => [409, { message: 'Another pharmacist is already reviewing this prescription' }],
    });
    const { router } = renderApp('/queue', { preloadedState: signedInState(users.pharmacist) });
    await userEvent.click(await screen.findByRole('button', { name: /claim/i }));
    expect(await screen.findByText(/another pharmacist is already reviewing/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/queue');
  });

  test('a successful claim opens the review page', async () => {
    mockApi({
      'GET /api/prescriptions/queue': () => [200, page([rx()])],
      'POST /api/prescriptions/rx1/claim': () => [200, { prescription: rx({ status: 'IN_REVIEW', isLocked: true, lockedByMe: true }) }],
      'GET /api/prescriptions/rx1': () => [
        200,
        { prescription: rx({ status: 'IN_REVIEW', isLocked: true, lockedByMe: true, lockedUntil: new Date(Date.now() + 600000).toISOString() }) },
      ],
      'GET /api/prescriptions/rx1/audit': () => [200, { entries: [] }],
      'GET /api/prescriptions/rx1/file': () => [200, {}],
    });
    const { router } = renderApp('/queue', { preloadedState: signedInState(users.pharmacist) });
    await userEvent.click(await screen.findByRole('button', { name: /claim/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/queue/rx1'));
    expect(await screen.findByText(/lock expires in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit decision/i })).toBeInTheDocument();
  });

  test('admins see the queue read-only', async () => {
    mockApi({ 'GET /api/prescriptions/queue': () => [200, page([rx()])] });
    renderApp('/queue', { preloadedState: signedInState(users.admin) });
    await screen.findByRole('link', { name: 'Carol Customer' });
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });
});
