import { SORT_OPTIONS } from './sortOptions.js';

export function TaskFilters({ values, members, currentUserId, onChange }) {
  const set = (key) => (event) => onChange({ ...values, [key]: event.target.value });

  return (
    <div className="toolbar">
      <input
        className="input search"
        type="search"
        placeholder="Search title or description…"
        aria-label="Search tasks"
        value={values.search}
        maxLength={100}
        onChange={set('search')}
      />
      <select
        className="input"
        aria-label="Filter by assignee"
        value={values.assigneeId}
        onChange={set('assigneeId')}
      >
        <option value="">Everyone</option>
        <option value={String(currentUserId)}>Assigned to me</option>
        {members
          .filter((m) => m.userId !== currentUserId)
          .map((m) => (
            <option key={m.userId} value={String(m.userId)}>
              {m.fullName}
            </option>
          ))}
      </select>
      <select className="input" aria-label="Sort tasks" value={values.sort} onChange={set('sort')}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
