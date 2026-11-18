import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../hooks/useAuth.js';
import { workspaceService } from '../services/workspace.service.js';
import { projectService } from '../services/project.service.js';
import { EmptyState, ErrorMessage, PageLoader } from '../components/common/Feedback.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { RoleBadge } from '../components/common/RoleBadge.jsx';
import { ProgressBar, StatsSummary } from '../components/common/Stats.jsx';
import { MemberPanel } from '../components/workspace/MemberPanel.jsx';
import { NameDescriptionForm } from '../components/workspace/WorkspaceForm.jsx';
import { getErrorMessage, getStatus } from '../utils/apiError.js';
import { isManager } from '../utils/permissions.js';

async function loadWorkspace(id) {
  const [workspace, projects, stats] = await Promise.all([
    workspaceService.get(id),
    projectService.listByWorkspace(id),
    workspaceService.stats(id),
  ]);
  return { workspace, projects, stats };
}

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(
    () => loadWorkspace(workspaceId),
    [workspaceId],
  );
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (loading && !data) return <PageLoader />;

  if (error && [403, 404].includes(getStatus(error))) {
    return (
      <EmptyState
        title="Workspace unavailable"
        description={getErrorMessage(error)}
        action={
          <Link to="/workspaces" className="btn btn-primary">
            Back to workspaces
          </Link>
        }
      />
    );
  }
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { workspace, projects, stats } = data;
  const manager = isManager(workspace.role);
  const progressById = Object.fromEntries(stats.projects.map((p) => [p.id, p]));
  const closeModal = () => setModal(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${workspace.name}" and all its projects and tasks?`)) return;
    try {
      await workspaceService.remove(workspace.id);
      navigate('/workspaces', { replace: true });
    } catch (err) {
      setActionError(err);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/workspaces">Workspaces</Link> /
          </div>
          <div className="row">
            <h1>{workspace.name}</h1>
            <RoleBadge role={workspace.role} />
          </div>
          {workspace.description && <p>{workspace.description}</p>}
        </div>
        {manager && (
          <div className="row">
            <button type="button" className="btn" onClick={() => setModal('edit')}>
              Edit
            </button>
            {workspace.role === 'OWNER' && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && <ErrorMessage error={actionError} />}

      <section className="section">
        <StatsSummary stats={stats} />
      </section>

      <div className="two-columns">
        <section>
          <div className="section-header">
            <h2>Projects</h2>
            {manager && (
              <button type="button" className="btn btn-primary" onClick={() => setModal('project')}>
                + New project
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description={
                manager
                  ? 'Create a project to start planning tasks.'
                  : 'An owner or admin can create the first project.'
              }
            />
          ) : (
            <div className="grid">
              {projects.map((project) => {
                const projectStats = progressById[project.id];
                return (
                  <Link key={project.id} to={`/projects/${project.id}`} className="card">
                    <div className="card-title">
                      <h3>{project.name}</h3>
                      <span className="muted small">{projectStats?.progress ?? 0}%</span>
                    </div>
                    <p>{project.description || 'No description'}</p>
                    <ProgressBar
                      value={projectStats?.progress ?? 0}
                      label={`${project.name} progress`}
                    />
                    <div className="row muted small" style={{ marginTop: 8 }}>
                      <span>{project.taskCount} tasks</span>
                      {projectStats?.overdue > 0 && (
                        <span className="badge badge-overdue">{projectStats.overdue} overdue</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <MemberPanel
          workspace={workspace}
          currentUserId={user.id}
          onChanged={reload}
          onLeft={() => navigate('/workspaces', { replace: true })}
        />
      </div>

      {modal === 'edit' && (
        <Modal title="Edit workspace" onClose={closeModal}>
          <NameDescriptionForm
            initial={workspace}
            submitLabel="Save changes"
            onCancel={closeModal}
            onSubmit={async (body) => {
              await workspaceService.update(workspace.id, body);
              closeModal();
              reload();
            }}
          />
        </Modal>
      )}

      {modal === 'project' && (
        <Modal title="New project" onClose={closeModal}>
          <NameDescriptionForm
            submitLabel="Create project"
            onCancel={closeModal}
            onSubmit={async (body) => {
              const project = await projectService.create({ ...body, workspaceId: workspace.id });
              navigate(`/projects/${project.id}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}
