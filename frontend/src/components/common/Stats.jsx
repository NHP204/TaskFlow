export function ProgressBar({ value, label = 'Progress' }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar" style={{ width: `${value}%` }} />
    </div>
  );
}

export function StatsSummary({ stats }) {
  const items = [
    ['Total tasks', stats.total],
    ['To do', stats.byStatus.TODO],
    ['In progress', stats.byStatus.IN_PROGRESS],
    ['Done', stats.byStatus.DONE],
    ['Overdue', stats.overdue],
    ['Progress', `${stats.progress}%`],
  ];
  return (
    <div className="stats">
      {items.map(([label, value]) => (
        <div key={label} className="stat">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
