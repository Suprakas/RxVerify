import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../appConfig';

/**
 * The access token lives only in memory (Redux), never in localStorage, so an
 * XSS bug can't read a long-lived token. On page load we ask the server for a
 * fresh one using the httpOnly refresh cookie.
 */
export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
});

const initialState = {
  user: null,
  accessToken: null,
  // idle -> checking -> ready: guards wait for "ready" before deciding.
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'ready';
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'ready';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'checking';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload ? action.payload.user : null;
        state.accessToken = action.payload ? action.payload.accessToken : null;
        state.status = 'ready';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'ready';
      });
  },
});

export const { setCredentials, loggedOut } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthStatus = (state) => state.auth.status;
