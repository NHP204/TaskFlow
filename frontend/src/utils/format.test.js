import { describe, expect, it } from 'vitest';
import { describeActivity, isOverdue, todayString } from './format.js';

describe('isOverdue', () => {
  const today = '2026-11-18';

  it('is true for unfinished tasks past their due date', () => {
    expect(isOverdue({ status: 'TODO', dueDate: '2026-11-17' }, today)).toBe(true);
  });

  it('is false for done tasks, tasks due today and tasks without due date', () => {
    expect(isOverdue({ status: 'DONE', dueDate: '2026-11-01' }, today)).toBe(false);
    expect(isOverdue({ status: 'TODO', dueDate: today }, today)).toBe(false);
    expect(isOverdue({ status: 'TODO', dueDate: null }, today)).toBe(false);
  });
});

describe('todayString', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('describeActivity', () => {
  it('describes status and assignee changes in words', () => {
    const lines = describeActivity(
      {
        action: 'TASK_UPDATED',
        changes: {
          status: { from: 'TODO', to: 'IN_PROGRESS' },
          assigneeId: { from: null, to: 7 },
        },
      },
      (id) => (id === 7 ? 'Chi Le' : '?'),
    );
    expect(lines).toEqual([
      'changed status from To do to In progress',
      'changed assignee from none to Chi Le',
    ]);
  });

  it('describes creation', () => {
    expect(describeActivity({ action: 'TASK_CREATED', changes: {} })).toEqual(['created the task']);
  });
});
