import { STATUS_LABELS } from '../../utils/status';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${String(status).toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}
