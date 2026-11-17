import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, mockApi, users, signedInState, readFormData } from '../../test/utils';

const config = () => [200, { aiEnabled: false, maxUploadMb: 5, lockMinutes: 10 }];

describe('NewPrescriptionPage', () => {
  test('validates every required field, including the file and medicines', async () => {
    const calls = mockApi({ 'GET /api/config': config });
    renderApp('/prescriptions/new', { preloadedState: signedInState(users.customer) });
    await userEvent.click(await screen.findByRole('button', { name: /submit for review/i }));

    expect(await screen.findByText('Enter the patient name')).toBeInTheDocument();
    expect(screen.getByText('Enter the doctor name')).toBeInTheDocument();
    expect(screen.getByText('Enter the medicine name')).toBeInTheDocument();
    expect(screen.getByText('Choose a prescription file')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /api/prescriptions')).toBe(false);
  });

  test('adds and removes medicine rows', async () => {
    mockApi({ 'GET /api/config': config });
    renderApp('/prescriptions/new', { preloadedState: signedInState(users.customer) });
    await userEvent.click(await screen.findByRole('button', { name: /add another medicine/i }));
    expect(screen.getByLabelText(/medicine 2 name/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove medicine 2/i }));
    expect(screen.queryByLabelText(/medicine 2 name/i)).not.toBeInTheDocument();
  });

  test('submits multipart data and opens the new prescription', async () => {
    let form;
    const { router } = (() => {
      mockApi({
        'GET /api/config': config,
        'POST /api/prescriptions': async ({ request }) => {
          form = readFormData(request);
          return [201, { prescription: { id: 'new1' } }];
        },
        'GET /api/prescriptions/new1': () => [
          200,
          {
            prescription: {
              id: 'new1',
              patientName: 'Carol',
              doctorName: 'Dr Mehta',
              issueDate: '2026-11-01',
              medicines: [{ name: 'Metformin', dosage: '500 mg', quantity: 60 }],
              status: 'SUBMITTED',
              createdAt: '2026-11-15T10:00:00.000Z',
              fileCount: 1,
              currentFile: { originalName: 'rx.png' },
            },
          },
        ],
        'GET /api/prescriptions/new1/audit': () => [200, { entries: [] }],
        'GET /api/prescriptions/new1/file': () => [200, {}],
      });
      return renderApp('/prescriptions/new', { preloadedState: signedInState(users.customer) });
    })();

    await userEvent.upload(await screen.findByTestId('file-input'), new File([new Uint8Array(10)], 'rx.png', { type: 'image/png' }));
    await userEvent.type(screen.getByLabelText(/patient name/i), 'Carol');
    await userEvent.type(screen.getByLabelText(/doctor name/i), 'Dr Mehta');
    await userEvent.type(screen.getByLabelText(/issue date/i), '2026-11-01');
    await userEvent.type(screen.getByLabelText(/medicine 1 name/i), 'Metformin');
    await userEvent.type(screen.getByLabelText(/^dosage$/i), '500 mg');
    const qty = screen.getByLabelText(/^qty/i);
    await userEvent.clear(qty);
    await userEvent.type(qty, '60');
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/prescriptions/new1'));
    expect(form.get('patientName')).toBe('Carol');
    expect(JSON.parse(form.get('medicines'))).toEqual([{ name: 'Metformin', dosage: '500 mg', quantity: 60 }]);
    expect(form.get('file').name).toBe('rx.png');
  });
});
