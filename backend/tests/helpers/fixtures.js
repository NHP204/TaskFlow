import { as, createUser } from './auth.js';

/**
 * Creates owner/admin/member/outsider users and a workspace where the first
 * three are members with the matching role.
 */
export async function createTeam(app) {
  const owner = await createUser(app);
  const admin = await createUser(app);
  const member = await createUser(app);
  const outsider = await createUser(app);

  const ws = await as(app, owner.token).post('/api/v1/workspaces').send({ name: 'Team' });
  const workspaceId = ws.body.data.id;

  for (const [user, role] of [
    [admin, 'ADMIN'],
    [member, 'MEMBER'],
  ]) {
    await as(app, owner.token)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .send({ email: user.user.email, role });
  }

  return { owner, admin, member, outsider, workspaceId };
}

export async function createProject(app, token, workspaceId, body = {}) {
  const res = await as(app, token)
    .post('/api/v1/projects')
    .send({ workspaceId, name: 'Project', ...body });
  if (res.status !== 201) {
    throw new Error(`createProject failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}
