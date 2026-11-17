import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, mockApi, users } from '../../test/utils';

const emptyPage = { items: [], page: 1, limit: 10, total: 0, totalPages: 1 };

describe('LoginPage', () => {
  test('shows field errors without calling the API', async () => {
    const calls = mockApi({ 'POST /api/auth/refresh': () => [401, {}] });
    renderApp('/login');
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(calls.filter((c) => c.key === 'POST /api/auth/login')).toHaveLength(0);
  });

  test('shows the server message on wrong credentials', async () => {
    mockApi({
      'POST /api/auth/refresh': () => [401, {}],
      'POST /api/auth/login': () => [401, { message: 'Incorrect email or password' }],
    });
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText(/email/i), 'carol@test.dev');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-pass1');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
  });

  test('signs in and returns to the page in ?next=', async () => {
    mockApi({
      'POST /api/auth/refresh': () => [401, {}],
      'POST /api/auth/login': () => [200, { user: users.customer, accessToken: 'abc' }],
      'GET /api/prescriptions/mine': () => [200, emptyPage],
      'GET /api/config': () => [200, { aiEnabled: false, maxUploadMb: 5, lockMinutes: 10 }],
    });
    const { router, store } = renderApp('/login?next=%2Fprescriptions%2Fnew');
    await userEvent.type(await screen.findByLabelText(/email/i), 'carol@test.dev');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/prescriptions/new'));
    expect(store.getState().auth.user.email).toBe('carol@test.dev');
  });
});
