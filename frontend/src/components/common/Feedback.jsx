import { getErrorMessage } from '../../utils/apiError.js';

export function Spinner({ small = false }) {
  return (
    <div className={`spinner${small ? ' spinner-sm' : ''}`} role="status" aria-label="Loading" />
  );
}

export function PageLoader() {
  return (
    <div className="spinner-wrap">
      <Spinner />
    </div>
  );
}

export function ErrorMessage({ error, message, onRetry }) {
  return (
    <div className="alert alert-row" role="alert">
      <span>{message ?? getErrorMessage(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
