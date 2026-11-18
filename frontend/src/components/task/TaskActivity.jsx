import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { taskService } from '../../services/task.service.js';
import { Avatar } from '../common/Avatar.jsx';
import { ErrorMessage, PageLoader } from '../common/Feedback.jsx';
import { Pagination } from '../common/Pagination.jsx';
import { describeActivity, formatDateTime } from '../../utils/format.js';

export function TaskActivity({ taskId, members, refreshKey }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(
    () => taskService.activity(taskId, { page, limit: 15 }),
    [taskId, page, refreshKey],
  );

  const memberName = (id) => members.find((m) => m.userId === id)?.fullName ?? 'a former member';

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  return (
    <>
      <ul className="timeline">
        {data.items.map((activity) => (
          <li key={activity.id}>
            <Avatar name={activity.user?.fullName ?? '?'} small />
            <div>
              <strong>{activity.user?.fullName ?? 'Deleted user'}</strong>{' '}
              {describeActivity(activity, memberName).join(', ')}
              <div className="muted small">{formatDateTime(activity.createdAt)}</div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination meta={data.meta} onPageChange={setPage} />
    </>
  );
}
