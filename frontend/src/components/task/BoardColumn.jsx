import { useState } from 'react';
import { ErrorMessage, Spinner } from '../common/Feedback.jsx';
import { TaskCard } from './TaskCard.jsx';

export function BoardColumn({ status, column, canDrag, onDropTask, onOpenTask, onLoadMore }) {
  const [dragOver, setDragOver] = useState(false);
  const { items, meta, loading, error } = column;
  const hasMore = meta && meta.page < meta.totalPages;

  return (
    <section
      className={`column${dragOver ? ' drag-over' : ''}`}
      aria-label={`${status.label} column`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const taskId = Number(event.dataTransfer.getData('text/plain'));
        if (taskId) onDropTask(taskId, status.value);
      }}
    >
      <div className="column-header">
        <span className="column-dot" style={{ background: status.color }} />
        {status.label}
        <span className="badge">{meta?.total ?? '…'}</span>
      </div>

      {error && <ErrorMessage error={error} />}

      <div className="column-tasks">
        {items.map((task) => (
          <TaskCard key={task.id} task={task} draggable={canDrag(task)} onOpen={onOpenTask} />
        ))}
        {!loading && !error && items.length === 0 && <div className="column-empty">No tasks</div>}
        {loading && (
          <div className="spinner-wrap" style={{ padding: 12 }}>
            <Spinner small />
          </div>
        )}
        {hasMore && !loading && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onLoadMore}>
            Load more ({meta.total - items.length} left)
          </button>
        )}
      </div>
    </section>
  );
}
