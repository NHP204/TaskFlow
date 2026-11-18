import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/Feedback.jsx';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or you no longer have access."
      action={
        <Link to="/workspaces" className="btn btn-primary">
          Back to workspaces
        </Link>
      }
    />
  );
}
