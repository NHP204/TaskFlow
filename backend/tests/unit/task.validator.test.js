import { describe, it, expect } from '@jest/globals';
import {
  createTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from '../../src/validators/task.validator.js';

const validateBody = (schema, body) => schema.body.validate(body, { abortEarly: false });

describe('task validators', () => {
  it.each(['TODO', 'IN_PROGRESS', 'DONE'])('accepts status %s', (status) => {
    expect(validateBody(updateTaskSchema, { status }).error).toBeUndefined();
  });

  it.each(['DOING', 'done', '', 'CANCELLED'])('rejects status %p', (status) => {
    const { error } = validateBody(updateTaskSchema, { status });
    expect(error.details[0].path).toEqual(['status']);
  });

  it('rejects malformed or impossible due dates', () => {
    for (const dueDate of ['2030/01/01', '2030-02-30', 'tomorrow']) {
      const { error } = validateBody(createTaskSchema, { projectId: 1, title: 'x', dueDate });
      expect(error.details[0].path).toEqual(['dueDate']);
    }
  });

  it('only allows whitelisted sort fields and applies defaults', () => {
    const query = listTasksSchema.query;

    expect(query.validate({ sortBy: 'id; DROP TABLE tasks' }).error).toBeDefined();
    expect(query.validate({ limit: 500 }).error).toBeDefined();
    expect(query.validate({}).value).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      order: 'desc',
    });
  });
});
