import { useNavigate, useSearchParams, Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useGetQueueQuery, useClaimPrescriptionMutation } from '../prescriptions/prescriptionsApi';
import { selectUser } from '../auth/authSlice';
import { getErrorInfo } from '../../app/api';
import { showToast } from '../../app/toastSlice';
import { formatDateTime } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Pagination from '../../components/Pagination/Pagination';
import Button from '../../components/Button/Button';
import { SkeletonList, EmptyState, ErrorState } from '../../components/StateViews/StateViews';
import './Queue.css';

const VIEWS = [
  { id: 'open', label: 'Open' },
  { id: 'mine', label: 'My reviews' },
  { id: 'decided', label: 'Decided' },
];

const EMPTY = {
  open: ['Queue is clear', 'New prescriptions appear here automatically.'],
  mine: ['You’re not reviewing anything', 'Claim a prescription from the Open tab.'],
  decided: ['No decisions yet', 'Approved, rejected and needs-info prescriptions show here.'],
};

function waitingFor(createdAt) {
  const minutes = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} days`;
}

export default function QueuePage() {
  const user = useSelector(selectUser);
  const isPharmacist = user.role === 'pharmacist';
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'open';
  const page = Number(params.get('page')) || 1;

  const { data, isLoading, error, refetch } = useGetQueueQuery({ view, page });
  const [claim, { isLoading: claiming, originalArgs: claimingId }] = useClaimPrescriptionMutation();

  const onClaim = async (id) => {
    try {
      await claim(id).unwrap();
      navigate(`/queue/${id}`);
    } catch (err) {
      dispatch(showToast({ message: getErrorInfo(err).message, tone: 'error' }));
    }
  };

  const setView = (next) => setParams({ view: next });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Review queue</h1>
          <p className="page-header__subtitle">
            Oldest first. Claiming a prescription locks it so no one else reviews it at the same time.
          </p>
        </div>
      </header>

      <div className="tabs" role="group" aria-label="Queue views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            className={`tabs__tab ${view === v.id ? 'tabs__tab--active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div>
        {isLoading ? (
          <SkeletonList rows={5} />
        ) : error ? (
          <ErrorState message={getErrorInfo(error).message} onRetry={refetch} />
        ) : !data.items.length ? (
          <EmptyState title={EMPTY[view][0]} message={EMPTY[view][1]} />
        ) : (
          <>
            <div className="queue-table-wrap">
              <table className="queue-table">
                <caption className="visually-hidden">Prescriptions in the {view} view</caption>
                <thead>
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Customer</th>
                    <th scope="col">{view === 'decided' ? 'Decided' : 'Waiting'}</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => {
                    const lockedByOther = p.isLocked && !p.lockedByMe;
                    const available = p.status === 'SUBMITTED' || (p.status === 'IN_REVIEW' && !p.isLocked);
                    return (
                      <tr key={p.id} className={p.lockedByMe ? 'queue-table__row--mine' : undefined}>
                        <td>
                          <Link to={`/queue/${p.id}`} className="queue-table__patient">
                            {p.patientName}
                          </Link>
                          <span className="queue-table__sub">{p.medicines.length} medicine(s)</span>
                        </td>
                        <td>{p.customer?.name}</td>
                        <td>{view === 'decided' ? formatDateTime(p.decidedAt) : waitingFor(p.createdAt)}</td>
                        <td>
                          <StatusBadge status={p.status} />
                          {lockedByOther && <span className="queue-table__sub">by {p.assignedTo?.name}</span>}
                          {p.lockedByMe && <span className="queue-table__sub">by you</span>}
                        </td>
                        <td className="queue-table__actions">
                          {isPharmacist && available && (
                            <Button size="sm" onClick={() => onClaim(p.id)} loading={claiming && claimingId === p.id}>
                              Claim
                            </Button>
                          )}
                          {p.lockedByMe && (
                            <Button size="sm" variant="secondary" to={`/queue/${p.id}`}>
                              Continue
                            </Button>
                          )}
                          {(!isPharmacist || lockedByOther || view === 'decided') && (
                            <Button size="sm" variant="ghost" to={`/queue/${p.id}`}>
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParams({ view, page: String(p) })} />
          </>
        )}
      </div>
    </div>
  );
}
