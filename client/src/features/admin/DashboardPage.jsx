import { lazy, Suspense } from 'react';
import { useGetStatsQuery } from './adminApi';
import { getErrorInfo } from '../../app/api';
import { STATUS_LABELS } from '../../utils/status';
import { Spinner, ErrorState } from '../../components/StateViews/StateViews';
import Button from '../../components/Button/Button';
import './Admin.css';

// Chart.js is the heaviest dependency, so it loads only when this page needs it.
const StatusChart = lazy(() => import('./StatusChart'));

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useGetStatsQuery();

  if (isLoading) return <Spinner label="Loading dashboard" />;
  if (error) return <ErrorState message={getErrorInfo(error).message} onRetry={refetch} />;

  const { counts, total, avgDecisionMinutes, aiEnabled } = data;
  const open = counts.SUBMITTED + counts.IN_REVIEW;
  const decided = counts.APPROVED + counts.REJECTED;
  const approvalRate = decided ? Math.round((counts.APPROVED / decided) * 100) : null;

  const tiles = [
    { label: 'Total prescriptions', value: total },
    { label: 'Waiting or in review', value: open },
    { label: 'Approval rate', value: approvalRate === null ? '—' : `${approvalRate}%`, sub: `${decided} final decisions` },
    {
      label: 'Average time to decision',
      value: avgDecisionMinutes === null ? '—' : avgDecisionMinutes < 60 ? `${avgDecisionMinutes} min` : `${(avgDecisionMinutes / 60).toFixed(1)} h`,
    },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__subtitle">Live overview of the verification workflow.</p>
        </div>
        <Button variant="secondary" to="/admin/users">
          Manage users
        </Button>
      </header>

      <ul className="stat-tiles">
        {tiles.map((t) => (
          <li key={t.label} className="stat-tile">
            <p className="stat-tile__label">{t.label}</p>
            <p className="stat-tile__value">{t.value}</p>
            {t.sub && <p className="stat-tile__sub">{t.sub}</p>}
          </li>
        ))}
      </ul>

      <div className="admin-grid">
        <section className="card" aria-labelledby="chart-title">
          <h2 id="chart-title" className="card__title">
            Prescriptions by status
          </h2>
          <Suspense fallback={<Spinner label="Loading chart" />}>
            <StatusChart counts={counts} />
          </Suspense>
        </section>
        <section className="card" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title" className="card__title">
            Breakdown
          </h2>
          <table className="breakdown">
            <tbody>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <tr key={status}>
                  <th scope="row">{label}</th>
                  <td>{counts[status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="admin-note">
            AI cross-check is <strong>{aiEnabled ? 'on' : 'off'}</strong> on this server.
          </p>
        </section>
      </div>
    </div>
  );
}
