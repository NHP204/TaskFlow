import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { workspaceService } from '../services/workspace.service.js';
import { EmptyState, ErrorMessage, PageLoader } from '../components/common/Feedback.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { RoleBadge } from '../components/common/RoleBadge.jsx';
import { NameDescriptionForm } from '../components/workspace/WorkspaceForm.jsx';

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { data: workspaces, error, loading, reload } = useAsync(() => workspaceService.list(), []);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (body) => {
    const workspace = await workspaceService.create(body);
    navigate(`/workspaces/${workspace.id}`);
  };

  const createButton = (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      + New workspace
    </button>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Workspaces</h1>
          <p>Spaces you belong to. Each workspace has its own members and projects.</p>
        </div>
        {createButton}
      </div>

      {loading && !workspaces && <PageLoader />}
      {error && <ErrorMessage error={error} onRetry={reload} />}

      {workspaces?.length === 0 && (
        <EmptyState
          title="No workspaces yet"
          description="Create a workspace to start organizing projects with your team."
          action={createButton}
        />
      )}

      {workspaces?.length > 0 && (
        <div className="grid">
          {workspaces.map((ws) => (
            <Link key={ws.id} to={`/workspaces/${ws.id}`} className="card">
              <div className="card-title">
                <h3>{ws.name}</h3>
                <RoleBadge role={ws.role} />
              </div>
              <p>{ws.description || 'No description'}</p>
              <span className="muted small">
                {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="New workspace" onClose={() => setCreating(false)}>
          <NameDescriptionForm
            submitLabel="Create workspace"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </>
  );
}
