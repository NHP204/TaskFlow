import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" className="brand">
      <img src="/favicon.svg" alt="" className="brand-logo" />
      TaskFlow
    </Link>
  );
}
