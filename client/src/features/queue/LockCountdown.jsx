import { useEffect, useState } from 'react';
import { formatCountdown } from '../../utils/format';

/** Shows how long the review lock has left and warns in the last two minutes. */
export default function LockCountdown({ lockedUntil, onExpire }) {
  const [remaining, setRemaining] = useState(() => new Date(lockedUntil).getTime() - Date.now());

  useEffect(() => {
    const tick = () => {
      const ms = new Date(lockedUntil).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0 && onExpire) onExpire();
      return ms;
    };
    tick();
    const timer = setInterval(() => {
      if (tick() <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil, onExpire]);

  const warning = remaining < 2 * 60 * 1000;
  return (
    <span className={`lock-timer ${warning ? 'lock-timer--warning' : ''}`}>
      {remaining > 0 ? (
        <>
          Lock expires in <strong>{formatCountdown(remaining)}</strong>
        </>
      ) : (
        <strong>Lock expired</strong>
      )}
      {/* Announce only the important moments, not every second. */}
      <span className="visually-hidden" aria-live="polite">
        {remaining <= 0 ? 'Your review lock expired' : warning ? 'Less than two minutes left on your review lock' : ''}
      </span>
    </span>
  );
}
