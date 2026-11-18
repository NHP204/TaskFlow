export const STATUSES = [
  { value: 'TODO', label: 'To do', color: 'var(--todo)' },
  { value: 'IN_PROGRESS', label: 'In progress', color: 'var(--in-progress)' },
  { value: 'DONE', label: 'Done', color: 'var(--done)' },
];

export const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value;

/** Today's date as 'YYYY-MM-DD' in local time (matches the API's DATE format). */
export function todayString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const isOverdue = (task, today = todayString()) =>
  Boolean(task.dueDate) && task.status !== 'DONE' && task.dueDate < today;

export function formatDate(value) {
  if (!value) return '';
  // Date-only strings are parsed as local dates to avoid a timezone shift.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FIELD_LABELS = {
  title: 'title',
  description: 'description',
  status: 'status',
  assigneeId: 'assignee',
  dueDate: 'due date',
  name: 'name',
};

/** Human-readable lines for an activity entry. `memberName(id)` resolves assignee ids. */
export function describeActivity(activity, memberName = (id) => `user #${id}`) {
  const show = (field, value) => {
    if (value === null || value === undefined || value === '') return 'none';
    if (field === 'assigneeId') return memberName(value);
    if (field === 'status') return statusLabel(value);
    if (field === 'dueDate') return formatDate(value);
    return `"${value}"`;
  };

  switch (activity.action) {
    case 'TASK_CREATED':
      return ['created the task'];
    case 'TASK_DELETED':
      return ['deleted the task'];
    case 'TASK_UPDATED':
      return Object.entries(activity.changes ?? {}).map(([field, { from, to }]) =>
        field === 'description'
          ? 'updated the description'
          : `changed ${FIELD_LABELS[field] ?? field} from ${show(field, from)} to ${show(field, to)}`,
      );
    default:
      return [activity.action.toLowerCase().replace(/_/g, ' ')];
  }
}
