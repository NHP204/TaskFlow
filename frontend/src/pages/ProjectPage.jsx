import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useTaskBoard } from '../hooks/useTaskBoard.js';
import { useToast } from '../hooks/useToast.jsx';
import { projectService } from '../services/project.service.js';
import { workspaceService } from '../services/workspace.service.js';
import { taskService } from '../services/task.service.js';
import { EmptyState, ErrorMessage, PageLoader } from '../components/common/Feedback.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ProgressBar } from '../components/common/Stats.jsx';
import { NameDescriptionForm } from '../components/workspace/WorkspaceForm.jsx';
import { BoardColumn } from '../components/task/BoardColumn.jsx';
import { TaskFilters } from '../components/task/TaskFilters.jsx';
import { SORT_OPTIONS } from '../components/task/sortOptions.js';
import { TaskForm } from '../components/task/TaskForm.jsx';
import { TaskDetail } from '../components/task/TaskDetail.jsx';
import { getErrorMessage, getStatus } from '../utils/apiError.js';
import { canEditTask, isManager } from '../utils/permissions.js';
import { STATUSES } from '../utils/format.js';

async function loadProject(id) {
  const project = await projectService.get(id);
  const workspace = await workspaceService.get(project.workspaceId);
  return { project, workspace };
}

function useFilterParams() {
  const [params, setParams] = useSearchParams();
  const values = {
    search: params.get('search') ?? '',
    assigneeId: params.get('assignee') ?? '',
    sort: params.get('sort') ?? SORT_OPTIONS[0].value,
  };
  const update = (next) => {
    const entries = { search: next.search, assignee: next.assigneeId, sort: next.sort };
    if (entries.sort === SORT_OPTIONS[0].value) delete entries.sort;
    setParams(Object.fromEntries(Object.entries(entries).filter(([, v]) => v)), { replace: true });
  };
  return [values, update];
}

function Board({ project, workspace, currentUserId, filterValues, onToast }) {
  const search = useDebouncedValue(filterValues.search.trim());
  const filters = useMemo(() => {
    const [sortBy, order] = filterValues.sort.split(':');
    const result = { sortBy, order };
    if (search) result.search = search;
    if (filterValues.assigneeId) result.assigneeId = filterValues.assigneeId;
    return result;
  }, [search, filterValues.assigneeId, filterValues.sort]);

  const { columns, reload, loadMore, moveTask } = useTaskBoard(project.id, filters);
  const [modal, setModal] = useState(null);

  const findTask = (taskId) =>
    Object.values(columns)
      .flatMap((c) => c.items)
      .find((t) => t.id === taskId);

  const handleDrop = async (taskId, status) => {
    const task = findTask(taskId);
    if (!task || task.status === status) return;
    try {
      await moveTask(task, status);
    } catch (err) {
      onToast(getErrorMessage(err), 'error');
    }
  };

  const closeModal = () => setModal(null);
  const members = workspace.members;

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal({ type: 'create' })}
        >
          + New task
        </button>
      </div>

      <div className="board">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status.value}
            status={status}
            column={columns[status.value]}
            canDrag={(task) => canEditTask(workspace.role, currentUserId, task)}
            onDropTask={handleDrop}
            onOpenTask={(task) => setModal({ type: 'detail', task })}
            onLoadMore={() => loadMore(status.value)}
          />
        ))}
      </div>

      {modal?.type === 'create' && (
        <Modal title="New task" onClose={closeModal}>
          <TaskForm
            members={members}
            onCancel={closeModal}
            onSubmit={async (body) => {
              await taskService.create({ ...body, projectId: project.id });
              closeModal();
              onToast('Task created');
              reload();
            }}
          />
        </Modal>
      )}

      {modal?.type === 'detail' && (
        <Modal title={modal.task.title} onClose={closeModal} wide>
          <TaskDetail
            task={modal.task}
            role={workspace.role}
            currentUserId={currentUserId}
            members={members}
            onUpdated={(task) => {
              setModal({ type: 'detail', task });
              reload();
            }}
            onDeleted={() => {
              closeModal();
              onToast('Task deleted');
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [filterValues, setFilterValues] = useFilterParams();
  const [editing, setEditing] = useState(false);

  const { data, error, loading, reload } = useAsync(() => loadProject(projectId), [projectId]);
  const stats = useAsync(() => projectService.stats(projectId), [projectId]);

  if (loading && !data) return <PageLoader />;
  if (error && [403, 404].includes(getStatus(error))) {
    return (
      <EmptyState
        title="Project unavailable"
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

  const { project, workspace } = data;
  const manager = isManager(workspace.role);

  const handleDelete = async () => {
    if (!window.confirm(`Delete project "${project.name}" and all its tasks?`)) return;
    try {
      await projectService.remove(project.id);
      navigate(`/workspaces/${workspace.id}`, { replace: true });
    } catch (err) {
      toast.show(getErrorMessage(err), 'error');
    }
  };

  const showToast = (message, type) => {
    toast.show(message, type);
    stats.reload();
  };

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="breadcrumb">
            <Link to="/workspaces">Workspaces</Link> /{' '}
            <Link to={`/workspaces/${workspace.id}`}>{workspace.name}</Link> /
          </div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
          {stats.data && (
            <div style={{ maxWidth: 420, marginTop: 12 }}>
              <div className="row small muted" style={{ marginBottom: 4 }}>
                <span>
                  {stats.data.byStatus.DONE} of {stats.data.total} tasks done
                </span>
                <span className="spacer" />
                <span>{stats.data.progress}%</span>
              </div>
              <ProgressBar value={stats.data.progress} label="Project progress" />
              {stats.data.overdue > 0 && (
                <span className="badge badge-overdue" style={{ marginTop: 8 }}>
                  {stats.data.overdue} overdue
                </span>
              )}
            </div>
          )}
        </div>
        {manager && (
          <div className="row">
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      <TaskFilters
        values={filterValues}
        members={workspace.members}
        currentUserId={user.id}
        onChange={setFilterValues}
      />

      <Board
        project={project}
        workspace={workspace}
        currentUserId={user.id}
        filterValues={filterValues}
        onToast={showToast}
      />

      {editing && (
        <Modal title="Edit project" onClose={() => setEditing(false)}>
          <NameDescriptionForm
            initial={project}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              await projectService.update(project.id, body);
              setEditing(false);
              reload();
            }}
          />
        </Modal>
      )}

      {toast.element}
    </>
  );
}
