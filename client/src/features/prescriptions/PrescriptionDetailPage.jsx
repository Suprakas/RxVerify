import { useParams, Link } from 'react-router';
import { useGetPrescriptionQuery, useGetAuditTrailQuery } from './prescriptionsApi';
import { getErrorInfo } from '../../app/api';
import { CUSTOMER_STATUS_HINTS, STATUS } from '../../utils/status';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Timeline from '../../components/Timeline/Timeline';
import FilePreview from '../../components/FilePreview/FilePreview';
import PrescriptionSummary from '../../components/PrescriptionSummary/PrescriptionSummary';
import { Spinner, ErrorState } from '../../components/StateViews/StateViews';
import ReuploadForm from './ReuploadForm';
import './Prescriptions.css';

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const { data: rx, isLoading, error, refetch } = useGetPrescriptionQuery(id);
  const { data: audit } = useGetAuditTrailQuery(id);

  if (isLoading) return <Spinner label="Loading prescription" />;
  if (error) {
    return (
      <div className="page">
        <ErrorState message={getErrorInfo(error).message} onRetry={error.status === 404 ? undefined : refetch} />
        <Link to="/prescriptions">Back to my prescriptions</Link>
      </div>
    );
  }

  const showReason = rx.decisionReason && (rx.status === STATUS.REJECTED || rx.status === STATUS.NEEDS_INFO);

  return (
    <div className="page">
      <nav aria-label="Breadcrumb">
        <Link to="/prescriptions" className="back-link">
          ← My prescriptions
        </Link>
      </nav>

      <header className="page-header">
        <div>
          <h1 className="page-header__title">Prescription for {rx.patientName}</h1>
          <p className="page-header__subtitle">{CUSTOMER_STATUS_HINTS[rx.status]}</p>
        </div>
        <StatusBadge status={rx.status} />
      </header>

      {showReason && (
        <div className={`reason-box reason-box--${rx.status.toLowerCase()}`} role="status">
          <p className="reason-box__label">Pharmacist’s note</p>
          <p>{rx.decisionReason}</p>
        </div>
      )}

      {rx.status === STATUS.NEEDS_INFO && <ReuploadForm prescriptionId={rx.id} />}

      <div className="detail-grid">
        <div className="detail-grid__main">
          <section className="card" aria-labelledby="details-title">
            <h2 id="details-title" className="card__title">
              Details
            </h2>
            <PrescriptionSummary prescription={rx} />
          </section>
          <section className="card" aria-labelledby="file-title">
            <h2 id="file-title" className="card__title">
              Uploaded file
            </h2>
            <FilePreview prescriptionId={rx.id} version={rx.fileCount} fileName={rx.currentFile?.originalName} />
          </section>
        </div>
        <aside className="card" aria-labelledby="history-title">
          <h2 id="history-title" className="card__title">
            History
          </h2>
          <Timeline entries={audit} />
        </aside>
      </div>
    </div>
  );
}
