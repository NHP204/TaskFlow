const COLUMNS = 'w.id, w.name, w.description, w.owner_id, w.created_at, w.updated_at';

function toWorkspace(row) {
  if (!row) return null;
  const workspace = {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.role) workspace.role = row.role;
  if (row.member_count !== undefined) workspace.memberCount = Number(row.member_count);
  return workspace;
}

export default function createWorkspaceRepository(db) {
  return {
    async create({ name, description, ownerId }, client = db) {
      const { rows } = await client.query(
        `INSERT INTO workspaces AS w (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING ${COLUMNS}`,
        [name, description, ownerId],
      );
      return toWorkspace(rows[0]);
    },

    async findById(id, client = db) {
      const { rows } = await client.query(`SELECT ${COLUMNS} FROM workspaces w WHERE w.id = $1`, [
        id,
      ]);
      return toWorkspace(rows[0]);
    },

    /** Workspaces the user belongs to, with their role and member count. */
    async findAllByUser(userId, client = db) {
      const { rows } = await client.query(
        `SELECT ${COLUMNS}, m.role,
                (SELECT COUNT(*) FROM workspace_members c WHERE c.workspace_id = w.id) AS member_count
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = $1
         ORDER BY w.created_at DESC, w.id DESC`,
        [userId],
      );
      return rows.map(toWorkspace);
    },

    async update(id, { name, description }, client = db) {
      const { rows } = await client.query(
        `UPDATE workspaces AS w
         SET name = COALESCE($2, w.name),
             description = CASE WHEN $3::boolean THEN $4 ELSE w.description END
         WHERE w.id = $1
         RETURNING ${COLUMNS}`,
        [id, name ?? null, description !== undefined, description ?? null],
      );
      return toWorkspace(rows[0]);
    },

    async delete(id, client = db) {
      const { rowCount } = await client.query('DELETE FROM workspaces WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
