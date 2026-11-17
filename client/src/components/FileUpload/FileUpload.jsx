import { useEffect, useId, useRef, useState } from 'react';
import Button from '../Button/Button';
import { formatBytes } from '../../utils/format';
import './FileUpload.css';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function validateFile(file, maxMb) {
  if (!file) return 'Choose a prescription file';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Use a JPG, PNG, WEBP or PDF file';
  if (file.size > maxMb * 1024 * 1024) return `File must be ${maxMb} MB or smaller`;
  return null;
}

/**
 * Drag-and-drop upload with a real button for keyboard and screen-reader users.
 * Checks type and size before upload; the server checks again (never trust the client).
 */
export default function FileUpload({ value, onChange, error, maxMb = 5, label = 'Prescription file' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const id = useId();
  const errorText = localError || error;

  useEffect(() => {
    if (!value || !value.type.startsWith('image/')) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (file) => {
    const problem = validateFile(file, maxMb);
    setLocalError(problem);
    onChange(problem ? null : file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) pick(file);
  };

  return (
    <div className="upload">
      <span className="upload__label" id={`${id}-label`}>
        {label} <span className="upload__required" aria-hidden="true">*</span>
      </span>

      <div
        className={`upload__zone ${dragging ? 'upload__zone--active' : ''} ${errorText ? 'upload__zone--error' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {value ? (
          <div className="upload__selected">
            {previewUrl ? (
              <img className="upload__thumb" src={previewUrl} alt="Preview of the selected prescription" />
            ) : (
              <span className="upload__file-icon" aria-hidden="true">
                PDF
              </span>
            )}
            <div className="upload__meta">
              <p className="upload__name">{value.name}</p>
              <p className="upload__size">{formatBytes(value.size)}</p>
            </div>
            <div className="upload__actions">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current.click()}>
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setLocalError(null);
                  inputRef.current.value = '';
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="upload__empty">
            <p className="upload__title">Drag your prescription here</p>
            <p className="upload__hint">JPG, PNG, WEBP or PDF, up to {maxMb} MB</p>
            <Button variant="secondary" onClick={() => inputRef.current.click()} aria-describedby={`${id}-label`}>
              Choose file
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="visually-hidden"
          accept={ACCEPTED_TYPES.join(',')}
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          data-testid="file-input"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (file) pick(file);
          }}
        />
      </div>

      <p className="upload__error" role="alert" aria-live="assertive">
        {errorText || ''}
      </p>
    </div>
  );
}
