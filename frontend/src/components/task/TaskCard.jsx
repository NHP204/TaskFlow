import { useState } from 'react';
import { Avatar } from '../common/Avatar.jsx';
import { formatDate, isOverdue } from '../../utils/format.js';

export function TaskCard({ task, draggable, onOpen }) {
  const [dragging, setDragging] = useState(false);
  const overdue = isOverdue(task);

  return (
    <div
      className={`task-card${dragging ? ' dragging' : ''}${task.pending ? ' pending' : ''}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', String(task.id));
        event.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(task)}
      role="button"
      tabIndex={0}
      aria-label={`Open task ${task.title}`}
    >
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        {task.assignee ? (
          <span className="row" style={{ gap: 4 }}>
            <Avatar name={task.assignee.fullName} small />
            {task.assignee.fullName}
          </span>
        ) : (
          <span>Unassigned</span>
        )}
        {task.dueDate && (
          <span className={overdue ? 'badge badge-overdue' : ''}>
            {overdue ? 'Overdue · ' : 'Due '}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
