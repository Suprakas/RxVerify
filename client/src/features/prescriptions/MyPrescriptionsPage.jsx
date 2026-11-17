import { Link, useSearchParams } from 'react-router';
import { useGetMyPrescriptionsQuery } from './prescriptionsApi';
import { getErrorInfo } from '../../app/api';
import { STATUS_LABELS } from '../../utils/status';
import { formatDate } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Pagination from '../../components/Pagination/Pagination';
import Button from '../../components/Button/Button';
import { SkeletonList, EmptyState, ErrorState } from '../../components/StateViews/StateViews';
import './Prescriptions.css';

export default function MyPrescriptionsPage() {
  // Page and filter live in the URL, so refresh and the back button keep them.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const status = params.get('status') || '';
  const { data, isLoading, isFetching, error, refetch } = useGetMyPrescriptionsQuery({ page, status });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    setParams(next);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">My prescriptions</h1>
          <p className="page-header__subtitle">Track every prescription you’ve uploaded.</p>
        </div>
        <Button to="/prescriptions/new">Upload prescription</Button>
      </header>

      <div className="toolbar">
        <label className="toolbar__filter">
          <span>Status</span>
          <select value={status} onChange={(e) => update({ status: e.target.value, page: null })}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {isFetching && !isLoading && <span className="toolbar__status muted">Updating…</span>}
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={getErrorInfo(error).message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState
          title={status ? 'No prescriptions with this status' : 'No prescriptions yet'}
          message={status ? 'Try another filter.' : 'Upload your first prescription and a pharmacist will review it.'}
          action={!status && <Button to="/prescriptions/new">Upload prescription</Button>}
        />
      ) : (
        <>
          <ul className="rx-list">
            {data.items.map((p) => (
              <li key={p.id}>
                <Link to={`/prescriptions/${p.id}`} className="rx-card">
                  <div className="rx-card__main">
                    <p className="rx-card__title">{p.patientName}</p>
                    <p className="rx-card__meta">
                      {p.doctorName} · issued {formatDate(p.issueDate)} · {p.medicines.length} medicine{p.medicines.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rx-card__side">
                    <StatusBadge status={p.status} />
                    <span className="rx-card__date">Uploaded {formatDate(p.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  );
}
