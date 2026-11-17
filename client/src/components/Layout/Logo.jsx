import { Link } from 'react-router';

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="RxVerify home">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path
          d="M9 8h7a5 5 0 0 1 0 10h-7zM9 18v7M15 18l8 7M23 18l-8 7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="logo__text">RxVerify</span>
    </Link>
  );
}
