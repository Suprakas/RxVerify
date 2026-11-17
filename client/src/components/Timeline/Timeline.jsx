import { ACTION_LABELS } from '../../utils/status';
import { formatDateTime } from '../../utils/format';
import './Timeline.css';

const who = (entry) => {
  if (entry.actorName) return entry.actorName;
  if (entry.actorRole === 'system') return 'System';
  return entry.actorRole.charAt(0).toUpperCase() + entry.actorRole.slice(1);
};

export default function Timeline({ entries }) {
  if (!entries || !entries.length) return <p className="muted">No activity yet.</p>;
  return (
    <ol className="timeline">
      {entries.map((entry) => (
        <li key={entry.id} className={`timeline__item timeline__item--${entry.action.toLowerCase()}`}>
          <span className="timeline__dot" aria-hidden="true" />
          <div className="timeline__body">
            <p className="timeline__title">{ACTION_LABELS[entry.action] || entry.action}</p>
            <p className="timeline__meta">
              {who(entry)} · <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
            </p>
            {entry.note && <p className="timeline__note">“{entry.note}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
