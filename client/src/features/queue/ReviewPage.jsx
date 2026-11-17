import { useCallback, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetPrescriptionQuery,
  useGetAuditTrailQuery,
  useClaimPrescriptionMutation,
  useReleasePrescriptionMutation,
} from '../prescriptions/prescriptionsApi';
import { selectUser } from '../auth/authSlice';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import { STATUS } from '../../utils/status';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Timeline from '../../components/Timeline/Timeline';
import FilePreview from '../../components/FilePreview/FilePreview';
import PrescriptionSummary from '../../components/PrescriptionSummary/PrescriptionSummary';
import Button from '../../components/Button/Button';
import { Spinner, ErrorState } from '../../components/StateViews/StateViews';
import AiSuggestions from './AiSuggestions';
import DecisionForm from './DecisionForm';
import LockCountdown from './LockCountdown';
import '../prescriptions/Prescriptions.css';
import './Queue.css';

export default function ReviewPage() {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const isPharmacist = user.role === 'pharmacist';
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: rx, isLoading, error, refetch } = useGetPrescriptionQuery(id);
  const { data: audit } = useGetAuditTrailQuery(id);
  const [claim, { isLoading: claiming }] = useClaimPrescriptionMutation();
  const [release, { isLoading: releasing }] = useReleasePrescriptionMutation();
  const [lockExpired, setLockExpired] = useState(false);
  const onExpire = useCallback(() => setLockExpired(true), []);

  if (isLoading) return <Spinner label="Loading prescription" />;
  if (error) {
    return (
      <div className="page">
        <ErrorState message={getErrorInfo(error).message} onRetry={refetch} />
        <Link to="/queue">Back to the queue</Link>
      </div>
    );
  }

  const run = async (action, successMessage, after) => {
    try {
      await action(rx.id).unwrap();
      setLockExpired(false);
      if (successMessage) dispatch(showToast({ message: successMessage, tone: 'success' }));
      if (after) after();
    } catch (err) {
      dispatch(showToast({ message: getErrorInfo(err).message, tone: 'error' }));
    }
  };

  const available = rx.status === STATUS.SUBMITTED || (rx.status === STATUS.IN_REVIEW && !rx.isLocked);
  const reviewing = isPharmacist && rx.lockedByMe;
  const lockedByOther = rx.isLocked && !rx.lockedByMe;

  return (
    <div className="page">
      <nav aria-label="Breadcrumb">
        <Link to="/queue" className="back-link">
          ← Review queue
        </Link>
      </nav>

      <header className="page-header">
        <div>
          <h1 className="page-header__title">Review: {rx.patientName}</h1>
          <p className="page-header__subtitle">Prescribed by {rx.doctorName}</p>
        </div>
        <StatusBadge status={rx.status} />
      </header>

      <div className="review-bar card" role="region" aria-label="Review status">
        {reviewing && (
          <>
            <LockCountdown lockedUntil={rx.lockedUntil} onExpire={onExpire} />
            <div className="review-bar__actions">
              <Button variant="secondary" size="sm" onClick={() => run(claim, 'Lock extended')} loading={claiming}>
                {lockExpired ? 'Claim again' : 'Extend lock'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => run(release, 'Returned to the queue', () => navigate('/queue'))} loading={releasing}>
                Release
              </Button>
            </div>
          </>
        )}
        {isPharmacist && available && (
          <>
            <p>This prescription is waiting for review.</p>
            <Button onClick={() => run(claim)} loading={claiming}>
              Claim and start review
            </Button>
          </>
        )}
        {lockedByOther && <p>{rx.assignedTo?.name || 'Another pharmacist'} is reviewing this prescription right now.</p>}
        {!isPharmacist && !lockedByOther && <p>Read-only view. Only pharmacists can review prescriptions.</p>}
        {isPharmacist && !available && !rx.isLocked && rx.status !== STATUS.IN_REVIEW && (
          <p>
            Decided{rx.assignedTo?.name ? ` by ${rx.assignedTo.name}` : ''}. {rx.decisionReason && `Reason: “${rx.decisionReason}”`}
          </p>
        )}
      </div>

      <div className="review-grid">
        <section className="card" aria-labelledby="file-title">
          <h2 id="file-title" className="card__title">
            Prescription file {rx.fileCount > 1 && <span className="muted">(upload {rx.fileCount})</span>}
          </h2>
          <FilePreview prescriptionId={rx.id} version={rx.fileCount} fileName={rx.currentFile?.originalName} />
        </section>

        <div className="review-grid__side">
          <section className="card" aria-labelledby="entered-title">
            <h2 id="entered-title" className="card__title">
              Entered by the customer
            </h2>
            <PrescriptionSummary prescription={rx} showCustomer />
          </section>

          <AiSuggestions prescription={rx} canRetry={reviewing} />

          {reviewing && (
            <section className="card" aria-labelledby="decision-title">
              <h2 id="decision-title" className="card__title">
                Your decision
              </h2>
              {lockExpired && (
                <p className="form-alert" role="alert">
                  Your lock expired. Claim it again before submitting.
                </p>
              )}
              <DecisionForm prescriptionId={rx.id} disabled={lockExpired} />
            </section>
          )}

          <section className="card" aria-labelledby="history-title">
            <h2 id="history-title" className="card__title">
              History
            </h2>
            <Timeline entries={audit} />
          </section>
        </div>
      </div>
    </div>
  );
}
