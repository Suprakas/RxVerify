import Button from '../Button/Button';
import './StateViews.css';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="state-spinner" role="status">
      <span className="state-spinner__circle" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="state-full">
      <Spinner label="Loading RxVerify" />
    </div>
  );
}

/** Grey placeholder rows while a list loads, so the layout doesn't jump. */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-list__row" key={i}>
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--text" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-box">
      <p className="state-box__title">{title}</p>
      {message && <p className="state-box__message">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong while loading this.', onRetry }) {
  return (
    <div className="state-box state-box--error" role="alert">
      <p className="state-box__title">Could not load</p>
      <p className="state-box__message">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
