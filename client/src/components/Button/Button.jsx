import { Link } from 'react-router';
import './Button.css';

export default function Button({ variant = 'primary', size = 'md', loading = false, to, className = '', children, disabled, ...rest }) {
  const classes = `btn btn--${variant} btn--${size} ${loading ? 'btn--loading' : ''} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
