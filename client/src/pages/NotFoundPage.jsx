import { Link } from 'react-router';
import '../components/StateViews/StateViews.css';

export default function NotFoundPage() {
  return (
    <main className="state-full">
      <div className="state-box">
        <p className="state-box__title">Page not found</p>
        <p className="state-box__message">The page you’re looking for doesn’t exist or has moved.</p>
        <Link to="/">Go to the home page</Link>
      </div>
    </main>
  );
}
