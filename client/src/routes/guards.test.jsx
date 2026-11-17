import { screen, waitFor } from '@testing-library/react';
import { renderApp, mockApi, users, signedInState } from '../test/utils';
import { safeNextPath } from './guards';

const emptyPage = { items: [], page: 1, limit: 10, total: 0, totalPages: 1 };

describe('route guards (React Router middleware)', () => {
  test('a visitor with no session is sent to login, keeping where they wanted to go', async () => {
    mockApi({ 'POST /api/auth/refresh': () => [401, { message: 'No active session' }] });
    const { router } = renderApp('/queue');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fqueue');
  });

  test('the refresh cookie restores the session on first load', async () => {
    mockApi({
      'POST /api/auth/refresh': () => [200, { user: users.customer, accessToken: 'fresh' }],
      'GET /api/prescriptions/mine': () => [200, emptyPage],
    });
    const { store } = renderApp('/prescriptions');
    expect(await screen.findByRole('heading', { name: /my prescriptions/i })).toBeInTheDocument();
    expect(store.getState().auth.accessToken).toBe('fresh');
  });

  test('a customer cannot open pharmacist pages', async () => {
    mockApi({ 'GET /api/prescriptions/mine': () => [200, emptyPage] });
    const { router } = renderApp('/queue', { preloadedState: signedInState(users.customer) });
    await waitFor(() => expect(router.state.location.pathname).toBe('/prescriptions'));
  });

  test('a pharmacist cannot open admin pages', async () => {
    mockApi({ 'GET /api/prescriptions/queue': () => [200, emptyPage] });
    const { router } = renderApp('/admin', { preloadedState: signedInState(users.pharmacist) });
    await waitFor(() => expect(router.state.location.pathname).toBe('/queue'));
  });

  test('signed-in users skip the login page', async () => {
    mockApi({ 'GET /api/admin/stats': () => [200, { counts: {}, total: 0, avgDecisionMinutes: null, aiEnabled: false }] });
    const { router } = renderApp('/login', { preloadedState: signedInState(users.admin) });
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });

  test('"/" goes to each role\'s home', async () => {
    mockApi({ 'GET /api/prescriptions/queue': () => [200, emptyPage] });
    const { router } = renderApp('/', { preloadedState: signedInState(users.pharmacist) });
    await waitFor(() => expect(router.state.location.pathname).toBe('/queue'));
  });

  test('safeNextPath blocks redirects to other sites', () => {
    expect(safeNextPath('/queue/1')).toBe('/queue/1');
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
