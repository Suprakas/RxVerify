import { isRouteErrorResponse, useRouteError, Link } from 'react-router';
import '../components/StateViews/StateViews.css';

export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'An unexpected error happened.';
  return (
    <main className="state-full">
      <div className="state-box state-box--error" role="alert">
        <p className="state-box__title">Something went wrong</p>
        <p className="state-box__message">{message}</p>
        <Link to="/">Go to the home page</Link>
      </div>
    </main>
  );
}
