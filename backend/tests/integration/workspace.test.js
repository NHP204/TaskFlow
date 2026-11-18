import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as, createUser } from '../helpers/auth.js';

const app = createApp({ db, env, logger: { error: () => {} } });

let owner;
let admin;
let member;
let outsider;
let workspaceId;

async function addMember(actor, email, role) {
  return as(app, actor.token)
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .send({ email, role });
}

beforeEach(async () => {
  await resetDatabase();
  owner = await createUser(app, { email: 'owner@example.com' });
  admin = await createUser(app, { email: 'admin@example.com' });
  member = await createUser(app, { email: 'member@example.com' });
  outsider = await createUser(app, { email: 'outsider@example.com' });

  const res = await as(app, owner.token)
    .post('/api/v1/workspaces')
    .send({ name: 'Team A', description: 'First team' });
  workspaceId = res.body.data.id;

  await addMember(owner, admin.user.email, 'ADMIN');
  await addMember(owner, member.user.email, 'MEMBER');
});

afterAll(() => db.close());

describe('Workspace CRUD', () => {
  it('requires authentication (401)', async () => {
    const res = await request(app).get('/api/v1/workspaces');
    expect(res.status).toBe(401);
  });

  it('creates a workspace with the creator as OWNER (201)', async () => {
    const res = await as(app, outsider.token).post('/api/v1/workspaces').send({ name: 'Solo' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Solo',
      description: null,
      ownerId: outsider.user.id,
      role: 'OWNER',
    });

    const { rows } = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [res.body.data.id, outsider.user.id],
    );
    expect(rows).toEqual([{ role: 'OWNER' }]);
  });

  it('validates the body (400)', async () => {
    const res = await as(app, owner.token).post('/api/v1/workspaces').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('name');
  });

  it('lists only workspaces the user belongs to, with role and member count', async () => {
    await as(app, outsider.token).post('/api/v1/workspaces').send({ name: 'Other' });

    const res = await as(app, member.token).get('/api/v1/workspaces');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: workspaceId, role: 'MEMBER', memberCount: 3 });
  });

  it('returns workspace detail with members for a member (200)', async () => {
    const res = await as(app, member.token).get(`/api/v1/workspaces/${workspaceId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('MEMBER');
    expect(res.body.data.members.map((m) => m.role)).toEqual(['OWNER', 'ADMIN', 'MEMBER']);
    expect(res.body.data.members[0]).not.toHaveProperty('passwordHash');
  });

  it('forbids non-members (403) and returns 404 for unknown workspaces', async () => {
    expect((await as(app, outsider.token).get(`/api/v1/workspaces/${workspaceId}`)).status).toBe(
      403,
    );
    expect((await as(app, owner.token).get('/api/v1/workspaces/999999')).status).toBe(404);
    expect((await as(app, owner.token).get('/api/v1/workspaces/abc')).status).toBe(400);
  });

  it('lets ADMIN update but not MEMBER', async () => {
    const ok = await as(app, admin.token)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .send({ name: 'Renamed', description: '' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ name: 'Renamed', description: null });

    const denied = await as(app, member.token)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .send({ name: 'Nope' });
    expect(denied.status).toBe(403);
  });

  it('rejects an empty update body (400)', async () => {
    const res = await as(app, owner.token).patch(`/api/v1/workspaces/${workspaceId}`).send({});
    expect(res.status).toBe(400);
  });

  it('only lets the OWNER delete, cascading memberships (204)', async () => {
    expect((await as(app, admin.token).delete(`/api/v1/workspaces/${workspaceId}`)).status).toBe(
      403,
    );

    const res = await as(app, owner.token).delete(`/api/v1/workspaces/${workspaceId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM workspace_members WHERE workspace_id = $1',
      [workspaceId],
    );
    expect(rows[0].n).toBe(0);
  });
});

describe('Workspace members', () => {
  it('adds a member by email (201)', async () => {
    const res = await addMember(admin, outsider.user.email);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: outsider.user.id,
      email: outsider.user.email,
      role: 'MEMBER',
    });
  });

  it('rejects unknown users (404), existing members (409) and invalid roles (400)', async () => {
    expect((await addMember(owner, 'ghost@example.com')).status).toBe(404);
    expect((await addMember(owner, member.user.email)).status).toBe(409);
    expect((await addMember(owner, outsider.user.email, 'OWNER')).status).toBe(400);
  });

  it('forbids MEMBER from adding and ADMIN from adding admins (403)', async () => {
    expect((await addMember(member, outsider.user.email)).status).toBe(403);
    expect((await addMember(admin, outsider.user.email, 'ADMIN')).status).toBe(403);
  });

  it('lets only the OWNER change roles', async () => {
    const url = `/api/v1/workspaces/${workspaceId}/members/${member.user.id}`;

    expect((await as(app, admin.token).patch(url).send({ role: 'ADMIN' })).status).toBe(403);

    const res = await as(app, owner.token).patch(url).send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it("cannot change the OWNER's role (403)", async () => {
    const res = await as(app, owner.token)
      .patch(`/api/v1/workspaces/${workspaceId}/members/${owner.user.id}`)
      .send({ role: 'MEMBER' });
    expect(res.status).toBe(403);
  });

  it('lets ADMIN remove a MEMBER, who then loses access', async () => {
    const res = await as(app, admin.token).delete(
      `/api/v1/workspaces/${workspaceId}/members/${member.user.id}`,
    );
    expect(res.status).toBe(204);

    expect((await as(app, member.token).get(`/api/v1/workspaces/${workspaceId}`)).status).toBe(403);
  });

  it('lets a member leave but never removes the OWNER', async () => {
    const base = `/api/v1/workspaces/${workspaceId}/members`;

    expect((await as(app, member.token).delete(`${base}/${member.user.id}`)).status).toBe(204);
    expect((await as(app, admin.token).delete(`${base}/${owner.user.id}`)).status).toBe(403);
    expect((await as(app, owner.token).delete(`${base}/${owner.user.id}`)).status).toBe(403);
  });

  it('returns 404 when removing a user who is not a member', async () => {
    const res = await as(app, owner.token).delete(
      `/api/v1/workspaces/${workspaceId}/members/${outsider.user.id}`,
    );
    expect(res.status).toBe(404);
  });
});
