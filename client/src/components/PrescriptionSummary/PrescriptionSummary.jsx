import { formatDate, formatDateTime } from '../../utils/format';
import './PrescriptionSummary.css';

export default function PrescriptionSummary({ prescription: rx, showCustomer = false }) {
  return (
    <div className="rx-summary">
      <dl className="rx-summary__facts">
        {showCustomer && rx.customer && (
          <div>
            <dt>Customer</dt>
            <dd>
              {rx.customer.name}
              {rx.customer.email && <span className="muted"> · {rx.customer.email}</span>}
            </dd>
          </div>
        )}
        <div>
          <dt>Patient</dt>
          <dd>{rx.patientName}</dd>
        </div>
        <div>
          <dt>Doctor</dt>
          <dd>{rx.doctorName}</dd>
        </div>
        <div>
          <dt>Issue date</dt>
          <dd>{formatDate(rx.issueDate)}</dd>
        </div>
        <div>
          <dt>Uploaded</dt>
          <dd>{formatDateTime(rx.createdAt)}</dd>
        </div>
      </dl>

      <table className="rx-summary__table">
        <caption className="visually-hidden">Medicines on this prescription</caption>
        <thead>
          <tr>
            <th scope="col">Medicine</th>
            <th scope="col">Dosage</th>
            <th scope="col" className="num">
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {rx.medicines.map((m, i) => (
            <tr key={`${m.name}-${i}`}>
              <td>{m.name}</td>
              <td>{m.dosage || '—'}</td>
              <td className="num">{m.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rx.notes && (
        <div className="rx-summary__notes">
          <p className="rx-summary__notes-label">Notes from the customer</p>
          <p>{rx.notes}</p>
        </div>
      )}
    </div>
  );
}
