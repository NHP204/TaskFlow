const COLUMNS =
  'p.id, p.workspace_id, p.name, p.description, p.created_by, p.created_at, p.updated_at';

function toProject(row) {
  if (!row) return null;
  const project = {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.task_count !== undefined) project.taskCount = Number(row.task_count);
  return project;
}

export default function createProjectRepository(db) {
  return {
    async create({ workspaceId, name, description, createdBy }, client = db) {
      const { rows } = await client.query(
        `INSERT INTO projects AS p (workspace_id, name, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUMNS}`,
        [workspaceId, name, description, createdBy],
      );
      return toProject(rows[0]);
    },

    async findById(id, client = db) {
      const { rows } = await client.query(`SELECT ${COLUMNS} FROM projects p WHERE p.id = $1`, [
        id,
      ]);
      return toProject(rows[0]);
    },

    async findAllByWorkspace(workspaceId, client = db) {
      const { rows } = await client.query(
        `SELECT ${COLUMNS},
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count
         FROM projects p
         WHERE p.workspace_id = $1
         ORDER BY p.created_at DESC, p.id DESC`,
        [workspaceId],
      );
      return rows.map(toProject);
    },

    async update(id, { name, description }, client = db) {
      const { rows } = await client.query(
        `UPDATE projects AS p
         SET name = COALESCE($2, p.name),
             description = CASE WHEN $3::boolean THEN $4 ELSE p.description END
         WHERE p.id = $1
         RETURNING ${COLUMNS}`,
        [id, name ?? null, description !== undefined, description ?? null],
      );
      return toProject(rows[0]);
    },

    async delete(id, client = db) {
      const { rowCount } = await client.query('DELETE FROM projects WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
