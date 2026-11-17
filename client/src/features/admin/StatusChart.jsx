import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { STATUS_LABELS } from '../../utils/status';

// Register only what this chart uses, so the bundle stays small.
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// Same colours as the status badges (see tokens.css).
const COLORS = {
  SUBMITTED: '#1d4ed8',
  IN_REVIEW: '#9a5b00',
  NEEDS_INFO: '#6d28d9',
  APPROVED: '#17734a',
  REJECTED: '#b42318',
};

const ORDER = ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED'];

export default function StatusChart({ counts }) {
  const data = {
    labels: ORDER.map((s) => STATUS_LABELS[s]),
    datasets: [
      {
        label: 'Prescriptions',
        data: ORDER.map((s) => counts[s] || 0),
        backgroundColor: ORDER.map((s) => COLORS[s]),
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#e6ecee' } },
      x: { grid: { display: false } },
    },
  };

  const summary = ORDER.map((s) => `${STATUS_LABELS[s]}: ${counts[s] || 0}`).join(', ');

  return (
    <div className="status-chart">
      <Bar data={data} options={options} role="img" aria-label={`Prescriptions by status. ${summary}`} />
    </div>
  );
}
