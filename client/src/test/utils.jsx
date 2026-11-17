import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { makeStore } from '../app/store';
import { buildRoutes } from '../routes/routes';
import { api } from '../app/api';

/**
 * Tiny fake backend: register handlers like
 *   { 'POST /api/auth/login': () => [200, { ... }] }
 * Unknown calls fail the test loudly instead of hanging.
 */
export function mockApi(handlers) {
  const calls = [];
  global.fetch = jest.fn(async (input, init = {}) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url, 'http://localhost');
    const key = `${request.method} ${url.pathname}`;
    calls.push({ key, url, request });
    const handler = handlers[key];
    if (!handler) throw new Error(`Unexpected request in test: ${key}`);
    const [status, body] = await handler({ url, request });
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
}

/** The fetch polyfill can't parse multipart bodies back, but it keeps the FormData it was given. */
export function readFormData(request) {
  return request._bodyFormData;
}

export const users = {
  customer: { id: 'c1', name: 'Carol Customer', email: 'carol@test.dev', role: 'customer', isActive: true },
  pharmacist: { id: 'p1', name: 'Priya Pharmacist', email: 'priya@test.dev', role: 'pharmacist', isActive: true },
  admin: { id: 'a1', name: 'Asha Admin', email: 'asha@test.dev', role: 'admin', isActive: true },
};

export function signedInState(user) {
  return { auth: { user, accessToken: 'test-token', status: 'ready' } };
}

/** Renders the real route tree at a URL, the same way main.jsx does. */
export function renderApp(path, { preloadedState } = {}) {
  const store = makeStore(preloadedState);
  const router = createMemoryRouter(buildRoutes(store), { initialEntries: [path] });
  const utils = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
  return { ...utils, store, router };
}

export function renderWithStore(ui, { preloadedState } = {}) {
  const store = makeStore(preloadedState);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
}

export function resetApi(store) {
  store.dispatch(api.util.resetApiState());
}
