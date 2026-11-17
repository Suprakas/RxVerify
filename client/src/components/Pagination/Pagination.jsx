import Button from '../Button/Button';
import './Pagination.css';

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <span className="pagination__label" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
