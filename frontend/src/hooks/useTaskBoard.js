import { useCallback, useEffect, useRef, useState } from 'react';
import { taskService } from '../services/task.service.js';
import { STATUSES } from '../utils/format.js';

const PAGE_SIZE = 20;
const emptyColumn = { items: [], meta: null, loading: true, error: null };
const initialColumns = () => Object.fromEntries(STATUSES.map((s) => [s.value, emptyColumn]));

/**
 * Kanban data: one paginated list per status, sharing the same filters.
 * moveTask updates the UI first and rolls back if the API rejects the change.
 */
export function useTaskBoard(projectId, filters) {
  const [columns, setColumns] = useState(initialColumns);
  const requestId = useRef(0);
  const filterKey = JSON.stringify(filters);

  const patchColumn = (status, patch) =>
    setColumns((prev) => ({ ...prev, [status]: { ...prev[status], ...patch(prev[status]) } }));

  const fetchPage = useCallback(
    (status, page) =>
      taskService.list(projectId, {
        ...JSON.parse(filterKey),
        status,
        page,
        limit: PAGE_SIZE,
      }),
    [projectId, filterKey],
  );

  const loadAll = useCallback(() => {
    const id = ++requestId.current;
    setColumns((prev) =>
      Object.fromEntries(Object.entries(prev).map(([k, c]) => [k, { ...c, loading: true }])),
    );
    for (const { value: status } of STATUSES) {
      fetchPage(status, 1)
        .then(({ items, meta }) => {
          if (id === requestId.current) {
            patchColumn(status, () => ({ items, meta, loading: false, error: null }));
          }
        })
        .catch((error) => {
          if (id === requestId.current) patchColumn(status, () => ({ loading: false, error }));
        });
    }
  }, [fetchPage]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadMore = async (status) => {
    const column = columns[status];
    if (!column.meta || column.meta.page >= column.meta.totalPages) return;
    patchColumn(status, () => ({ loading: true }));
    try {
      const { items, meta } = await fetchPage(status, column.meta.page + 1);
      patchColumn(status, (prev) => {
        const known = new Set(prev.items.map((t) => t.id));
        return {
          items: [...prev.items, ...items.filter((t) => !known.has(t.id))],
          meta,
          loading: false,
        };
      });
    } catch (error) {
      patchColumn(status, () => ({ loading: false, error }));
    }
  };

  const removeFrom = (column, taskId) => ({
    items: column.items.filter((t) => t.id !== taskId),
    meta: column.meta && { ...column.meta, total: column.meta.total - 1 },
  });

  const addTo = (column, task) => ({
    items: [task, ...column.items.filter((t) => t.id !== task.id)],
    meta: column.meta && { ...column.meta, total: column.meta.total + 1 },
  });

  /** Optimistically moves a task to another status column. */
  const moveTask = async (task, status) => {
    if (task.status === status) return;
    const moved = { ...task, status, pending: true };
    setColumns((prev) => ({
      ...prev,
      [task.status]: { ...prev[task.status], ...removeFrom(prev[task.status], task.id) },
      [status]: { ...prev[status], ...addTo(prev[status], moved) },
    }));

    try {
      const saved = await taskService.update(task.id, { status });
      setColumns((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          items: prev[status].items.map((t) => (t.id === task.id ? saved : t)),
        },
      }));
    } catch (error) {
      setColumns((prev) => ({
        ...prev,
        [status]: { ...prev[status], ...removeFrom(prev[status], task.id) },
        [task.status]: { ...prev[task.status], ...addTo(prev[task.status], task) },
      }));
      throw error;
    }
  };

  return { columns, reload: loadAll, loadMore, moveTask };
}
