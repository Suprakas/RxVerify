import { useEffect, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { API_URL } from '../appConfig';
import { refreshAccessToken } from '../app/api';

/**
 * Prescription files are private, so an <img src="/api/..."> can't load them
 * (it can't send the Authorization header). We fetch the file with the token,
 * turn it into a temporary blob: URL, and revoke it when we're done.
 */
export default function useAuthorizedFile(prescriptionId, version) {
  const store = useStore();
  const dispatch = useDispatch();
  const [state, setState] = useState({ url: null, type: null, loading: true, error: null });

  useEffect(() => {
    if (!prescriptionId) return undefined;
    let objectUrl = null;
    let cancelled = false;

    const load = async () => {
      setState({ url: null, type: null, loading: true, error: null });
      const request = (token) =>
        fetch(`${API_URL}/api/prescriptions/${prescriptionId}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
      try {
        let res = await request(store.getState().auth.accessToken);
        if (res.status === 401) {
          const fresh = await refreshAccessToken(dispatch);
          if (fresh) res = await request(fresh);
        }
        if (!res.ok) throw new Error('Could not load the file');
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, type: blob.type, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ url: null, type: null, loading: false, error: err.message });
      }
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [prescriptionId, version, store, dispatch]);

  return state;
}
