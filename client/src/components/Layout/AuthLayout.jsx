import { Outlet } from 'react-router';
import Logo from './Logo';
import './Layout.css';

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Logo />
        <div className="auth-aside__copy">
          <h1 className="auth-aside__title">Prescriptions, verified by a pharmacist.</h1>
          <p className="auth-aside__text">
            Upload a photo or PDF of your prescription. A pharmacist reviews it and you see every step as it happens.
          </p>
        </div>
        <ul className="auth-aside__list">
          <li>Private file storage, never public links</li>
          <li>Live status updates</li>
          <li>Full history of every decision</li>
        </ul>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
