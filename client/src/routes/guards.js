import { redirect } from 'react-router';
import { restoreSession } from '../features/auth/authSlice';
import { ROLE_HOME } from '../utils/status';

/**
 * Route middleware (React Router v8, data mode). Middleware runs top-down on
 * every navigation, before loaders and before anything renders, so a guarded
 * page never flashes for a user who isn't allowed to see it.
 */

// Root: on the first navigation, swap the refresh cookie for an access token.
export const sessionMiddleware = (store) => async () => {
  if (store.getState().auth.status === 'idle') {
    await store.dispatch(restoreSession());
  }
};

export const requireAuth = (store) => async ({ request }) => {
  if (!store.getState().auth.user) {
    const url = new URL(request.url);
    const next = `${url.pathname}${url.search}`;
    throw redirect(`/login?next=${encodeURIComponent(next)}`);
  }
};

export const requireRole = (store, roles) => async () => {
  const { user } = store.getState().auth;
  if (!user) throw redirect('/login');
  if (!roles.includes(user.role)) throw redirect(ROLE_HOME[user.role] || '/');
};

// Login and register pages: already signed in -> go home.
export const redirectIfAuthenticated = (store) => async () => {
  const { user } = store.getState().auth;
  if (user) throw redirect(ROLE_HOME[user.role] || '/');
};

export const homeRedirectLoader = (store) => () => {
  const { user } = store.getState().auth;
  return redirect(user ? ROLE_HOME[user.role] : '/login');
};

/** Only follow ?next= to paths inside this app (no open redirects to other sites). */
export function safeNextPath(next) {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}
