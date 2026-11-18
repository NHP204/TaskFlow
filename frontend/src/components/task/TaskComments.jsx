import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { commentService } from '../../services/comment.service.js';
import { Avatar } from '../common/Avatar.jsx';
import { EmptyState, ErrorMessage, PageLoader } from '../common/Feedback.jsx';
import { Pagination } from '../common/Pagination.jsx';
import { canDeleteComment } from '../../utils/permissions.js';
import { formatDateTime } from '../../utils/format.js';

const PAGE_SIZE = 10;

function CommentItem({ comment, canEdit, canDelete, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [error, setError] = useState(null);

  const save = async () => {
    try {
      await commentService.update(comment.id, content.trim());
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentService.remove(comment.id);
      onDeleted();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <li>
      <Avatar name={comment.author.fullName} small />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row">
          <strong>{comment.author.fullName}</strong>
          <span className="muted small">{formatDateTime(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && <span className="muted small">(edited)</span>}
          <span className="spacer" />
          {canEdit && !editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={remove}>
              Delete
            </button>
          )}
        </div>
        {error && <ErrorMessage error={error} />}
        {editing ? (
          <div className="form" style={{ marginTop: 6 }}>
            <textarea
              className="input"
              aria-label="Edit comment"
              value={content}
              maxLength={2000}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="form-actions">
              <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!content.trim()}
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-body">{comment.content}</div>
        )}
      </div>
    </li>
  );
}

export function TaskComments({ taskId, role, currentUserId }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(
    () => commentService.list(taskId, { page, limit: PAGE_SIZE }),
    [taskId, page],
  );
  const [draft, setDraft] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await commentService.create(taskId, draft.trim());
      setDraft('');
      // Jump to the last page, where the new comment is.
      const total = (data?.meta.total ?? 0) + 1;
      const lastPage = Math.ceil(total / PAGE_SIZE);
      if (lastPage === page) reload();
      else setPage(lastPage);
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {loading && !data && <PageLoader />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data?.items.length === 0 && (
        <EmptyState title="No comments yet" description="Start the discussion below." />
      )}
      {data?.items.length > 0 && (
        <ul className="timeline">
          {data.items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canEdit={comment.author.id === currentUserId}
              canDelete={canDeleteComment(role, currentUserId, comment)}
              onSaved={reload}
              onDeleted={() => (data.items.length === 1 && page > 1 ? setPage(page - 1) : reload())}
            />
          ))}
        </ul>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} />

      <form className="form" onSubmit={submit} style={{ marginTop: 14 }}>
        {submitError && <ErrorMessage error={submitError} />}
        <textarea
          className="input"
          placeholder="Write a comment…"
          aria-label="New comment"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || !draft.trim()}>
            Comment
          </button>
        </div>
      </form>
    </div>
  );
}
