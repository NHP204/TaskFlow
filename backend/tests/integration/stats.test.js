import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as } from '../helpers/auth.js';
import { createProject, createTeam } from '../helpers/fixtures.js';

const app = createApp({ db, env, logger: { error: () => {} } });

let team;
let web;
let mobile;

async function createTask(projectId, body) {
  const res = await as(app, team.owner.token)
    .post('/api/v1/tasks')
    .send({ projectId, title: 'Task', ...body });
  return res.body.data;
}

beforeEach(async () => {
  await resetDatabase();
  team = await createTeam(app);
  mobile = await createProject(app, team.owner.token, team.workspaceId, { name: 'Mobile' });
  web = await createProject(app, team.owner.token, team.workspaceId, { name: 'Web' });

  await createTask(web.id, { status: 'DONE', assigneeId: team.member.user.id });
  await createTask(web.id, { status: 'DONE' });
  await createTask(web.id, { status: 'IN_PROGRESS', assigneeId: team.admin.user.id });
  const late = await createTask(web.id, { status: 'TODO', assigneeId: team.member.user.id });

  // The API refuses past due dates, so make one task overdue directly.
  await db.query(`UPDATE tasks SET due_date = CURRENT_DATE - 3 WHERE id = $1`, [late.id]);
});

afterAll(() => db.close());

describe('GET /api/v1/projects/:id/stats', () => {
  it('returns counts by status, progress, overdue and unassigned', async () => {
    const res = await as(app, team.member.token).get(`/api/v1/projects/${web.id}/stats`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      projectId: web.id,
      total: 4,
      byStatus: { TODO: 1, IN_PROGRESS: 1, DONE: 2 },
      progress: 50,
      overdue: 1,
      unassigned: 1,
    });
  });

  it('returns zero progress for an empty project', async () => {
    const res = await as(app, team.owner.token).get(`/api/v1/projects/${mobile.id}/stats`);
    expect(res.body.data).toMatchObject({ total: 0, progress: 0 });
  });

  it('forbids outsiders (403) and returns 404 for unknown projects', async () => {
    expect(
      (await as(app, team.outsider.token).get(`/api/v1/projects/${web.id}/stats`)).status,
    ).toBe(403);
    expect((await as(app, team.owner.token).get('/api/v1/projects/999999/stats')).status).toBe(404);
  });
});

describe('GET /api/v1/workspaces/:id/stats', () => {
  it('returns workspace totals and per-project progress', async () => {
    const res = await as(app, team.member.token).get(
      `/api/v1/workspaces/${team.workspaceId}/stats`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      workspaceId: team.workspaceId,
      projectCount: 2,
      total: 4,
      byStatus: { TODO: 1, IN_PROGRESS: 1, DONE: 2 },
      progress: 50,
      overdue: 1,
    });
    expect(res.body.data.projects).toEqual([
      expect.objectContaining({ id: web.id, name: 'Web', total: 4, progress: 50 }),
      expect.objectContaining({ id: mobile.id, name: 'Mobile', total: 0, progress: 0 }),
    ]);
  });

  it('forbids outsiders (403)', async () => {
    const res = await as(app, team.outsider.token).get(
      `/api/v1/workspaces/${team.workspaceId}/stats`,
    );
    expect(res.status).toBe(403);
  });
});
