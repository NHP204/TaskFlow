import { useState } from 'react';
import { Avatar } from '../common/Avatar.jsx';
import { ErrorMessage } from '../common/Feedback.jsx';
import { taskService } from '../../services/task.service.js';
import { canDeleteTask, canEditTask } from '../../utils/permissions.js';
import { formatDate, formatDateTime, isOverdue, statusLabel } from '../../utils/format.js';
import { TaskForm } from './TaskForm.jsx';
import { TaskComments } from './TaskComments.jsx';
import { TaskActivity } from './TaskActivity.jsx';

export function TaskDetail({ task, role, currentUserId, members, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('comments');
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  const canEdit = canEditTask(role, currentUserId, task);
  const canDelete = canDeleteTask(role, currentUserId, task);
  const creator = members.find((m) => m.userId === task.createdBy);

  const handleSave = async (body) => {
    const updated = await taskService.update(task.id, body);
    setEditing(false);
    setRevision((r) => r + 1);
    onUpdated(updated);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await taskService.remove(task.id);
      onDeleted(task);
    } catch (err) {
      setError(err);
    }
  };

  if (editing) {
    return (
      <TaskForm
        task={task}
        members={members}
        onSubmit={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      {error && <ErrorMessage error={error} />}

      <div className="row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <span className={`badge badge-${task.status.toLowerCase()}`}>
          {statusLabel(task.status)}
        </span>
        {isOverdue(task) && <span className="badge badge-overdue">Overdue</span>}
        <span className="spacer" />
        {canEdit && (
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        {canDelete && (
          <button type="button" className="btn btn-sm btn-danger" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>

      <p className="comment-body" style={{ margin: '0 0 16px' }}>
        {task.description || <span className="muted">No description</span>}
      </p>

      <div className="form-row small">
        <div>
          <div className="muted">Assignee</div>
          {task.assignee ? (
            <span className="row">
              <Avatar name={task.assignee.fullName} small />
              {task.assignee.fullName}
            </span>
          ) : (
            'Unassigned'
          )}
        </div>
        <div>
          <div className="muted">Due date</div>
          {task.dueDate ? formatDate(task.dueDate) : 'None'}
        </div>
        <div>
          <div className="muted">Created by</div>
          {creator?.fullName ?? 'Former member'}
        </div>
        <div>
          <div className="muted">Last updated</div>
          {formatDateTime(task.updatedAt)}
        </div>
      </div>

      {!canEdit && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Only managers, the creator or the assignee can edit this task.
        </p>
      )}

      <div className="tabs" role="tablist">
        {[
          ['comments', 'Comments'],
          ['activity', 'Activity'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'comments' ? (
        <TaskComments taskId={task.id} role={role} currentUserId={currentUserId} />
      ) : (
        <TaskActivity taskId={task.id} members={members} refreshKey={revision} />
      )}
    </>
  );
}
