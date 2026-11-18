import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as } from '../helpers/auth.js';
import { createProject, createTeam } from '../helpers/fixtures.js';

const app = createApp({ db, env, logger: { error: () => {} } });

let team;
let project;

const createTask = async (token, body = {}) => {
  const res = await as(app, token)
    .post('/api/v1/tasks')
    .send({ projectId: project.id, title: 'Task', ...body });
  return res;
};

const listTasks = (token, query = '') =>
  as(app, token).get(`/api/v1/projects/${project.id}/tasks${query}`);

beforeEach(async () => {
  await resetDatabase();
  team = await createTeam(app);
  project = await createProject(app, team.owner.token, team.workspaceId);
});

afterAll(() => db.close());

describe('POST /api/v1/tasks', () => {
  it('lets a MEMBER create and assign a task (201)', async () => {
    const res = await createTask(team.member.token, {
      title: 'Build login page',
      description: 'With validation',
      assigneeId: team.admin.user.id,
      dueDate: '2099-12-31',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      projectId: project.id,
      title: 'Build login page',
      status: 'TODO',
      assigneeId: team.admin.user.id,
      assignee: { id: team.admin.user.id, email: team.admin.user.email },
      createdBy: team.member.user.id,
      dueDate: '2099-12-31',
    });
  });

  it('rejects an assignee outside the workspace (400)', async () => {
    const res = await createTask(team.owner.token, { assigneeId: team.outsider.user.id });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('assigneeId');
  });

  it('rejects invalid status, past due date and missing title (400)', async () => {
    expect((await createTask(team.owner.token, { status: 'DOING' })).status).toBe(400);
    expect((await createTask(team.owner.token, { dueDate: '2000-01-01' })).status).toBe(400);
    expect((await createTask(team.owner.token, { title: '' })).status).toBe(400);
  });

  it('returns 403 for outsiders, 404 for unknown projects, 401 without token', async () => {
    expect((await createTask(team.outsider.token)).status).toBe(403);
    expect((await createTask(team.owner.token, { projectId: 999999 })).status).toBe(404);
    expect(
      (await request(app).post('/api/v1/tasks').send({ projectId: project.id, title: 'x' })).status,
    ).toBe(401);
  });
});

describe('Reading, updating and deleting a task', () => {
  let task;

  beforeEach(async () => {
    const res = await createTask(team.member.token, {
      title: 'Original',
      assigneeId: team.member.user.id,
    });
    task = res.body.data;
  });

  it('lets members read the task but not outsiders', async () => {
    const url = `/api/v1/tasks/${task.id}`;
    expect((await as(app, team.admin.token).get(url)).status).toBe(200);
    expect((await as(app, team.outsider.token).get(url)).status).toBe(403);
    expect((await as(app, team.owner.token).get('/api/v1/tasks/999999')).status).toBe(404);
  });

  it('updates status and records activity with from/to values', async () => {
    const res = await as(app, team.member.token)
      .patch(`/api/v1/tasks/${task.id}`)
      .send({ status: 'IN_PROGRESS', title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'IN_PROGRESS', title: 'Renamed' });

    const activity = await as(app, team.owner.token).get(`/api/v1/tasks/${task.id}/activity`);
    expect(activity.status).toBe(200);
    expect(activity.body.data.map((a) => a.action)).toEqual(['TASK_UPDATED', 'TASK_CREATED']);
    expect(activity.body.data[0].changes).toEqual({
      status: { from: 'TODO', to: 'IN_PROGRESS' },
      title: { from: 'Original', to: 'Renamed' },
    });
    expect(activity.body.data[0].user).toEqual({
      id: team.member.user.id,
      fullName: team.member.user.fullName,
    });
    expect(activity.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it('forbids members who are neither creator, assignee nor manager (403)', async () => {
    const other = await as(app, team.owner.token)
      .post('/api/v1/tasks')
      .send({ projectId: project.id, title: 'Owner task' });

    const res = await as(app, team.member.token)
      .patch(`/api/v1/tasks/${other.body.data.id}`)
      .send({ status: 'DONE' });
    expect(res.status).toBe(403);
  });

  it('hides activity from outsiders (403)', async () => {
    const res = await as(app, team.outsider.token).get(`/api/v1/tasks/${task.id}/activity`);
    expect(res.status).toBe(403);
  });

  it('deletes the task (204) and keeps the deletion in project history', async () => {
    const res = await as(app, team.member.token).delete(`/api/v1/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect((await as(app, team.owner.token).get(`/api/v1/tasks/${task.id}`)).status).toBe(404);

    const { rows } = await db.query(
      `SELECT task_id, changes FROM activity_logs WHERE action = 'TASK_DELETED' AND project_id = $1`,
      [project.id],
    );
    expect(rows).toEqual([{ task_id: null, changes: { title: 'Original' } }]);
  });

  it('unassigns tasks of a member removed from the workspace', async () => {
    await as(app, team.owner.token).delete(
      `/api/v1/workspaces/${team.workspaceId}/members/${team.member.user.id}`,
    );

    const { rows } = await db.query('SELECT assignee_id FROM tasks WHERE id = $1', [task.id]);
    expect(rows[0].assignee_id).toBeNull();
  });
});

describe('GET /api/v1/projects/:id/tasks', () => {
  beforeEach(async () => {
    const token = team.owner.token;
    await createTask(token, { title: 'Design database', status: 'DONE', dueDate: '2099-01-10' });
    await createTask(token, {
      title: 'Build auth API',
      status: 'IN_PROGRESS',
      assigneeId: team.member.user.id,
      dueDate: '2099-01-05',
    });
    await createTask(token, {
      title: 'Write tests',
      description: 'Use 100% coverage on auth',
      assigneeId: team.member.user.id,
    });
    await createTask(token, { title: 'Deploy', dueDate: '2099-02-01' });
  });

  it('returns tasks with pagination meta, newest first by default', async () => {
    const res = await listTasks(team.member.token);

    expect(res.status).toBe(200);
    expect(res.body.data.map((t) => t.title)).toEqual([
      'Deploy',
      'Write tests',
      'Build auth API',
      'Design database',
    ]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
  });

  it('filters by status and assignee', async () => {
    const byStatus = await listTasks(team.owner.token, '?status=IN_PROGRESS');
    expect(byStatus.body.data.map((t) => t.title)).toEqual(['Build auth API']);

    const byAssignee = await listTasks(team.owner.token, `?assigneeId=${team.member.user.id}`);
    expect(byAssignee.body.data).toHaveLength(2);
    expect(byAssignee.body.meta.total).toBe(2);
  });

  it('filters by due date range', async () => {
    const res = await listTasks(team.owner.token, '?dueFrom=2099-01-01&dueTo=2099-01-31');
    expect(res.body.data.map((t) => t.title).sort()).toEqual(['Build auth API', 'Design database']);
  });

  it('searches title and description, treating % literally', async () => {
    const byTitle = await listTasks(team.owner.token, '?search=AUTH');
    expect(byTitle.body.data.map((t) => t.title).sort()).toEqual(['Build auth API', 'Write tests']);

    const literal = await listTasks(team.owner.token, `?search=${encodeURIComponent('100%')}`);
    expect(literal.body.data.map((t) => t.title)).toEqual(['Write tests']);

    const wildcard = await listTasks(team.owner.token, `?search=${encodeURIComponent('%')}`);
    expect(wildcard.body.data).toHaveLength(1);
  });

  it('sorts by due date ascending with tasks without due date last', async () => {
    const res = await listTasks(team.owner.token, '?sortBy=dueDate&order=asc');
    expect(res.body.data.map((t) => t.dueDate)).toEqual([
      '2099-01-05',
      '2099-01-10',
      '2099-02-01',
      null,
    ]);
  });

  it('paginates and reports the total even past the last page', async () => {
    const page2 = await listTasks(team.owner.token, '?limit=3&page=2');
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });

    const beyond = await listTasks(team.owner.token, '?limit=3&page=5');
    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.meta.total).toBe(4);
  });

  it('rejects unsupported sort fields and invalid query values (400)', async () => {
    expect((await listTasks(team.owner.token, '?sortBy=password_hash')).status).toBe(400);
    expect((await listTasks(team.owner.token, '?status=DOING')).status).toBe(400);
    expect((await listTasks(team.owner.token, '?page=0')).status).toBe(400);
  });

  it('forbids outsiders from listing tasks (403)', async () => {
    expect((await listTasks(team.outsider.token)).status).toBe(403);
  });
});
