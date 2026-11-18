import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as } from '../helpers/auth.js';
import { createProject, createTeam } from '../helpers/fixtures.js';

const app = createApp({ db, env, logger: { error: () => {} } });

let team;

beforeEach(async () => {
  await resetDatabase();
  team = await createTeam(app);
});

afterAll(() => db.close());

describe('POST /api/v1/projects', () => {
  it('lets OWNER and ADMIN create projects (201) and logs the activity', async () => {
    const res = await as(app, team.admin.token)
      .post('/api/v1/projects')
      .send({ workspaceId: team.workspaceId, name: 'Website', description: 'Redesign' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      workspaceId: team.workspaceId,
      name: 'Website',
      description: 'Redesign',
      createdBy: team.admin.user.id,
    });

    const { rows } = await db.query('SELECT action FROM activity_logs WHERE project_id = $1', [
      res.body.data.id,
    ]);
    expect(rows).toEqual([{ action: 'PROJECT_CREATED' }]);
  });

  it('forbids MEMBER and non-members (403)', async () => {
    const body = { workspaceId: team.workspaceId, name: 'X' };
    expect((await as(app, team.member.token).post('/api/v1/projects').send(body)).status).toBe(403);
    expect((await as(app, team.outsider.token).post('/api/v1/projects').send(body)).status).toBe(
      403,
    );
  });

  it('returns 404 for a workspace that does not exist', async () => {
    const res = await as(app, team.owner.token)
      .post('/api/v1/projects')
      .send({ workspaceId: 999999, name: 'X' });
    expect(res.status).toBe(404);
  });

  it('validates input (400) and requires auth (401)', async () => {
    const invalid = await as(app, team.owner.token).post('/api/v1/projects').send({ name: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors.map((e) => e.field).sort()).toEqual(['name', 'workspaceId']);

    expect((await request(app).post('/api/v1/projects').send({})).status).toBe(401);
  });
});

describe('Reading projects', () => {
  it('lists projects of a workspace with task counts for any member', async () => {
    await createProject(app, team.owner.token, team.workspaceId, { name: 'A' });
    await createProject(app, team.owner.token, team.workspaceId, { name: 'B' });

    const res = await as(app, team.member.token).get(
      `/api/v1/workspaces/${team.workspaceId}/projects`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.name)).toEqual(['B', 'A']);
    expect(res.body.data[0].taskCount).toBe(0);
  });

  it('returns project detail to members, 403 to outsiders, 404 when missing', async () => {
    const project = await createProject(app, team.owner.token, team.workspaceId);
    const url = `/api/v1/projects/${project.id}`;

    expect((await as(app, team.member.token).get(url)).status).toBe(200);
    expect((await as(app, team.outsider.token).get(url)).status).toBe(403);
    expect((await as(app, team.owner.token).get('/api/v1/projects/999999')).status).toBe(404);
    expect(
      (await as(app, team.outsider.token).get(`/api/v1/workspaces/${team.workspaceId}/projects`))
        .status,
    ).toBe(403);
  });
});

describe('Updating and deleting projects', () => {
  let project;

  beforeEach(async () => {
    project = await createProject(app, team.owner.token, team.workspaceId, { name: 'Old' });
  });

  it('lets ADMIN update and records the changed fields', async () => {
    const res = await as(app, team.admin.token)
      .patch(`/api/v1/projects/${project.id}`)
      .send({ name: 'New', description: '' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'New', description: null });

    const { rows } = await db.query(
      `SELECT changes FROM activity_logs WHERE project_id = $1 AND action = 'PROJECT_UPDATED'`,
      [project.id],
    );
    expect(rows[0].changes).toEqual({ name: { from: 'Old', to: 'New' } });
  });

  it('forbids MEMBER from updating or deleting (403)', async () => {
    const url = `/api/v1/projects/${project.id}`;
    expect((await as(app, team.member.token).patch(url).send({ name: 'x' })).status).toBe(403);
    expect((await as(app, team.member.token).delete(url)).status).toBe(403);
  });

  it('deletes the project (204)', async () => {
    const res = await as(app, team.owner.token).delete(`/api/v1/projects/${project.id}`);
    expect(res.status).toBe(204);
    expect((await as(app, team.owner.token).get(`/api/v1/projects/${project.id}`)).status).toBe(
      404,
    );
  });
});
