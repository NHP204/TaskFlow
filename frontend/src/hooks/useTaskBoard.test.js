import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTaskBoard } from './useTaskBoard.js';
import { taskService } from '../services/task.service.js';

vi.mock('../services/task.service.js', () => ({
  taskService: { list: vi.fn(), update: vi.fn() },
}));

const task = { id: 1, title: 'Write tests', status: 'TODO' };
const meta = (total) => ({ page: 1, limit: 20, total, totalPages: total ? 1 : 0 });

beforeEach(() => {
  vi.resetAllMocks();
  taskService.list.mockImplementation(async (_projectId, { status }) =>
    status === 'TODO' ? { items: [task], meta: meta(1) } : { items: [], meta: meta(0) },
  );
});

async function renderBoard() {
  const hook = renderHook(() => useTaskBoard(7, { sortBy: 'createdAt', order: 'desc' }));
  await waitFor(() => expect(hook.result.current.columns.TODO.loading).toBe(false));
  return hook;
}

describe('useTaskBoard', () => {
  it('loads one paginated list per status with shared filters', async () => {
    const { result } = await renderBoard();

    expect(taskService.list).toHaveBeenCalledTimes(3);
    expect(taskService.list).toHaveBeenCalledWith(7, {
      sortBy: 'createdAt',
      order: 'desc',
      status: 'IN_PROGRESS',
      page: 1,
      limit: 20,
    });
    expect(result.current.columns.TODO.items).toEqual([task]);
  });

  it('moves a task optimistically and keeps the saved version', async () => {
    let resolveUpdate;
    taskService.update.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
    const { result } = await renderBoard();

    let move;
    act(() => {
      move = result.current.moveTask(task, 'DONE');
    });

    expect(result.current.columns.TODO.items).toEqual([]);
    expect(result.current.columns.DONE.items[0]).toMatchObject({ id: 1, pending: true });

    await act(async () => {
      resolveUpdate({ ...task, status: 'DONE' });
      await move;
    });

    expect(result.current.columns.DONE.items[0]).toEqual({ ...task, status: 'DONE' });
    expect(result.current.columns.DONE.meta.total).toBe(1);
    expect(taskService.update).toHaveBeenCalledWith(1, { status: 'DONE' });
  });

  it('rolls the task back when the API rejects the move', async () => {
    taskService.update.mockRejectedValue({ response: { status: 403 } });
    const { result } = await renderBoard();

    await act(async () => {
      await expect(result.current.moveTask(task, 'IN_PROGRESS')).rejects.toBeDefined();
    });

    expect(result.current.columns.TODO.items).toEqual([task]);
    expect(result.current.columns.IN_PROGRESS.items).toEqual([]);
    expect(result.current.columns.TODO.meta.total).toBe(1);
  });
});
