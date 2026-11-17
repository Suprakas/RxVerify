import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useNavigation } from 'react-router';
import { useSelector } from 'react-redux';
import { selectUser, selectAuthStatus } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApi';
import useRealtime from '../../hooks/useRealtime';
import Button from '../Button/Button';
import Logo from './Logo';
import './Layout.css';

const NAV = {
  customer: [
    { to: '/prescriptions', label: 'My prescriptions', end: true },
    { to: '/prescriptions/new', label: 'Upload new' },
  ],
  pharmacist: [{ to: '/queue', label: 'Review queue' }],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/queue', label: 'Queue' },
  ],
};

export default function AppLayout() {
  const user = useSelector(selectUser);
  const authStatus = useSelector(selectAuthStatus);
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [logout, { isLoading }] = useLogoutMutation();
  const { connected } = useRealtime();

  // If the session ends while the page is open (refresh failed), go to login.
  useEffect(() => {
    if (authStatus === 'ready' && !user) navigate('/login', { replace: true });
  }, [authStatus, user, navigate]);

  if (!user) return null;

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <Logo />
          <nav className="app-nav" aria-label="Main">
            {(NAV[user.role] || []).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="app-nav__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-header__user">
            <span className={`live-dot ${connected ? 'live-dot--on' : ''}`} title={connected ? 'Live updates on' : 'Reconnecting'}>
              <span className="visually-hidden">{connected ? 'Live updates on' : 'Live updates reconnecting'}</span>
            </span>
            <span className="app-header__name">
              {user.name}
              <span className="app-header__role">{user.role}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={onLogout} loading={isLoading}>
              Sign out
            </Button>
          </div>
        </div>
        {navigation.state === 'loading' && <div className="route-progress" role="progressbar" aria-label="Loading page" />}
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
