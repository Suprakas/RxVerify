import { useRetryExtractionMutation } from '../prescriptions/prescriptionsApi';
import { compareMedicines, COMPARE_LABELS } from '../../utils/compareMedicines';
import Button from '../../components/Button/Button';
import { Spinner } from '../../components/StateViews/StateViews';
import './Queue.css';

/**
 * Shows what the AI read from the uploaded file next to what the customer typed.
 * It is a cross-check for the pharmacist only: it never changes the prescription.
 */
export default function AiSuggestions({ prescription, canRetry }) {
  const [retry, { isLoading }] = useRetryExtractionMutation();
  const ai = prescription.aiExtraction;
  if (!ai || ai.status === 'disabled') return null;

  return (
    <section className="card ai-panel" aria-labelledby="ai-title">
      <div className="ai-panel__header">
        <h2 id="ai-title" className="card__title">
          AI cross-check
        </h2>
        {canRetry && ai.status !== 'pending' && (
          <Button variant="ghost" size="sm" onClick={() => retry(prescription.id)} loading={isLoading}>
            Run again
          </Button>
        )}
      </div>

      {ai.status === 'pending' && (
        <div className="ai-panel__pending">
          <Spinner label="Reading the prescription" />
          <p className="muted">Reading the prescription file…</p>
        </div>
      )}

      {ai.status === 'failed' && <p className="ai-panel__failed">{ai.error || 'The file could not be read automatically.'} Check it manually.</p>}

      {ai.status === 'done' && (
        <>
          <table className="ai-table">
            <caption className="visually-hidden">Customer entries compared with medicines read from the file</caption>
            <thead>
              <tr>
                <th scope="col">Customer entered</th>
                <th scope="col">Read from file</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {compareMedicines(prescription.medicines, ai.medicines).map((row, i) => (
                <tr key={i} className={`ai-table__row ai-table__row--${row.result}`}>
                  <td>{row.entered ? `${row.entered.name} ${row.entered.dosage || ''} × ${row.entered.quantity}` : '—'}</td>
                  <td>
                    {row.extracted ? (
                      <>
                        {row.extracted.name} {row.extracted.dosage}
                        {row.extracted.quantity != null && ` × ${row.extracted.quantity}`}
                        {row.extracted.confidence === 'low' && <span className="ai-table__low"> (unclear)</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`ai-flag ai-flag--${row.result}`}>{COMPARE_LABELS[row.result]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ai-panel__disclaimer">Suggestions only. Always confirm against the uploaded file.</p>
        </>
      )}
    </section>
  );
}
