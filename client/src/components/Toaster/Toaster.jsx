import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../../app/toastSlice';
import './Toaster.css';

function Toast({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), 5000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <li className={`toast toast--${toast.tone}`}>
      <span>{toast.message}</span>
      <button type="button" className="toast__close" onClick={() => dispatch(dismissToast(toast.id))} aria-label="Dismiss notification">
        ×
      </button>
    </li>
  );
}

/** One polite live region: screen readers announce each new message once. */
export default function Toaster() {
  const toasts = useSelector((state) => state.toasts);
  return (
    <ol className="toaster" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </ol>
  );
}
