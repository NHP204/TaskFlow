function toMember(row) {
  if (!row) return null;
  const member = {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
  if (row.email) {
    member.email = row.email;
    member.fullName = row.full_name;
  }
  return member;
}

const MEMBER_WITH_USER = `
  SELECT m.workspace_id, m.user_id, m.role, m.joined_at, u.email, u.full_name
  FROM workspace_members m
  JOIN users u ON u.id = m.user_id`;

export default function createWorkspaceMemberRepository(db) {
  return {
    async find(workspaceId, userId, client = db) {
      const { rows } = await client.query(
        `${MEMBER_WITH_USER} WHERE m.workspace_id = $1 AND m.user_id = $2`,
        [workspaceId, userId],
      );
      return toMember(rows[0]);
    },

    async findAllByWorkspace(workspaceId, client = db) {
      const { rows } = await client.query(
        `${MEMBER_WITH_USER}
         WHERE m.workspace_id = $1
         ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, m.joined_at`,
        [workspaceId],
      );
      return rows.map(toMember);
    },

    async add({ workspaceId, userId, role }, client = db) {
      const { rows } = await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)
         RETURNING workspace_id, user_id, role, joined_at`,
        [workspaceId, userId, role],
      );
      return toMember(rows[0]);
    },

    async updateRole(workspaceId, userId, role, client = db) {
      const { rows } = await client.query(
        `UPDATE workspace_members SET role = $3
         WHERE workspace_id = $1 AND user_id = $2
         RETURNING workspace_id, user_id, role, joined_at`,
        [workspaceId, userId, role],
      );
      return toMember(rows[0]);
    },

    async remove(workspaceId, userId, client = db) {
      const { rowCount } = await client.query(
        'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId],
      );
      return rowCount > 0;
    },
  };
}
