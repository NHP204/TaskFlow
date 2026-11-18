import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as } from '../helpers/auth.js';
import { createProject, createTeam } from '../helpers/fixtures.js';

const app = createApp({ db, env, logger: { error: () => {} } });

let team;
let taskId;

const addComment = (token, content = 'Looks good') =>
  as(app, token).post(`/api/v1/tasks/${taskId}/comments`).send({ content });

beforeEach(async () => {
  await resetDatabase();
  team = await createTeam(app);
  const project = await createProject(app, team.owner.token, team.workspaceId);
  const task = await as(app, team.owner.token)
    .post('/api/v1/tasks')
    .send({ projectId: project.id, title: 'Task' });
  taskId = task.body.data.id;
});

afterAll(() => db.close());

describe('Task comments', () => {
  it('lets any member comment (201) and lists comments oldest first', async () => {
    const first = await addComment(team.member.token, 'First');
    await addComment(team.admin.token, 'Second');

    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      taskId,
      content: 'First',
      author: { id: team.member.user.id, fullName: team.member.user.fullName },
    });
    expect(first.body.data).not.toHaveProperty('workspaceId');

    const list = await as(app, team.owner.token).get(`/api/v1/tasks/${taskId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((c) => c.content)).toEqual(['First', 'Second']);
    expect(list.body.meta.total).toBe(2);
  });

  it('rejects empty content (400), outsiders (403) and unknown tasks (404)', async () => {
    expect((await addComment(team.member.token, '   ')).status).toBe(400);
    expect((await addComment(team.outsider.token)).status).toBe(403);
    expect((await as(app, team.owner.token).get('/api/v1/tasks/999999/comments')).status).toBe(404);
  });

  it('only lets the author edit a comment', async () => {
    const { body } = await addComment(team.member.token);
    const url = `/api/v1/comments/${body.data.id}`;

    expect((await as(app, team.owner.token).patch(url).send({ content: 'x' })).status).toBe(403);

    const res = await as(app, team.member.token).patch(url).send({ content: 'Edited' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('Edited');
  });

  it('lets the author or a manager delete, but not other members', async () => {
    const byMember = await addComment(team.member.token);
    const byAdmin = await addComment(team.admin.token);

    expect(
      (await as(app, team.member.token).delete(`/api/v1/comments/${byAdmin.body.data.id}`)).status,
    ).toBe(403);
    expect(
      (await as(app, team.admin.token).delete(`/api/v1/comments/${byMember.body.data.id}`)).status,
    ).toBe(204);
    expect(
      (await as(app, team.admin.token).delete(`/api/v1/comments/${byAdmin.body.data.id}`)).status,
    ).toBe(204);
    expect((await as(app, team.admin.token).delete('/api/v1/comments/999999')).status).toBe(404);
  });

  it('removes comments when the task is deleted', async () => {
    await addComment(team.member.token);
    await as(app, team.owner.token).delete(`/api/v1/tasks/${taskId}`);

    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM task_comments');
    expect(rows[0].n).toBe(0);
  });
});
