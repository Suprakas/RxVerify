import { cloneElement, isValidElement, useId } from 'react';
import './FormField.css';

/**
 * Label + control + hint + error, wired together with ids so screen readers
 * announce the label, the hint and the error for the focused input.
 */
export default function FormField({ label, hint, error, children, className = '', required = false }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: `field__control ${children.props.className || ''}`.trim(),
      })
    : children;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
