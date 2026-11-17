import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../appConfig';
import { setCredentials, loggedOut } from '../features/auth/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// One refresh at a time: if five requests get a 401 together, they share one refresh call.
let refreshing = null;

export async function refreshAccessToken(dispatch) {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          dispatch(loggedOut());
          return null;
        }
        const data = await res.json();
        dispatch(setCredentials(data));
        return data.accessToken;
      })
      .catch(() => {
        dispatch(loggedOut());
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** On a 401, try one silent refresh, then replay the original request. */
async function baseQueryWithReauth(args, api, extraOptions) {
  let result = await rawBaseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error && result.error.status === 401 && !url.startsWith('/auth/')) {
    const token = await refreshAccessToken(api.dispatch);
    if (token) result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Prescription', 'Queue', 'Audit', 'Stats', 'User', 'Config'],
  endpoints: () => ({}),
});

/** Turns an RTK Query error into a readable message plus optional field errors. */
export function getErrorInfo(error) {
  if (!error) return { message: '', details: {} };
  if (error.status === 'FETCH_ERROR') return { message: 'Cannot reach the server. Check your connection.', details: {} };
  const data = error.data || {};
  return { message: data.message || 'Something went wrong', details: data.details || {} };
}
