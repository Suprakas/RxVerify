import { useEffect, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../appConfig';
import { api, refreshAccessToken } from '../app/api';
import { showToast } from '../app/toastSlice';
import { selectUser } from '../features/auth/authSlice';
import { STATUS_LABELS } from '../utils/status';

/**
 * Keeps one Socket.io connection per signed-in user. The server only says
 * "prescription X changed"; we mark the matching RTK Query cache entries as
 * stale and they refetch through the normal (authorized) REST API.
 */
export default function useRealtime() {
  const user = useSelector(selectUser);
  const userId = user ? user.id : null;
  const role = user ? user.role : null;
  const store = useStore();
  const dispatch = useDispatch();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;

    const socket = io(SOCKET_URL, {
      // Called on every (re)connect, so it always sends the latest access token.
      auth: (cb) => cb({ token: store.getState().auth.accessToken }),
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', async (err) => {
      setConnected(false);
      if (err.message === 'unauthorized') {
        const token = await refreshAccessToken(dispatch);
        if (token) socket.connect();
      }
    });

    socket.on('prescription:updated', ({ id, status, aiUpdated }) => {
      dispatch(
        api.util.invalidateTags([
          { type: 'Prescription', id },
          { type: 'Prescription', id: 'LIST' },
          { type: 'Audit', id },
          'Queue',
          'Stats',
        ])
      );
      if (role === 'customer' && !aiUpdated && status !== 'SUBMITTED') {
        dispatch(showToast({ message: `A prescription was updated: ${STATUS_LABELS[status]}`, tone: status === 'REJECTED' ? 'error' : 'info' }));
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [userId, role, store, dispatch]);

  return { connected };
}
