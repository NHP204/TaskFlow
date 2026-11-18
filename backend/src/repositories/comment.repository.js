const COMMENT_COLUMNS = `
  c.id, c.task_id, c.user_id, c.content, c.created_at, c.updated_at,
  u.full_name AS author_name, u.email AS author_email`;

function toComment(row) {
  if (!row) return null;
  const comment = {
    id: row.id,
    taskId: row.task_id,
    content: row.content,
    author: { id: row.user_id, fullName: row.author_name, email: row.author_email },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.workspace_id) comment.workspaceId = row.workspace_id;
  return comment;
}

export default function createCommentRepository(db) {
  async function findById(id, client = db) {
    const { rows } = await client.query(
      `SELECT ${COMMENT_COLUMNS}, p.workspace_id
       FROM task_comments c
       JOIN users u ON u.id = c.user_id
       JOIN tasks t ON t.id = c.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE c.id = $1`,
      [id],
    );
    return toComment(rows[0]);
  }

  return {
    findById,

    async create({ taskId, userId, content }, client = db) {
      const { rows } = await client.query(
        `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
        [taskId, userId, content],
      );
      return findById(rows[0].id, client);
    },

    async findByTask(taskId, { limit, offset }, client = db) {
      const { rows } = await client.query(
        `SELECT ${COMMENT_COLUMNS}, COUNT(*) OVER () AS total
         FROM task_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.task_id = $1
         ORDER BY c.created_at ASC, c.id ASC
         LIMIT $2 OFFSET $3`,
        [taskId, limit, offset],
      );
      return { items: rows.map(toComment), total: rows.length ? Number(rows[0].total) : 0 };
    },

    async update(id, content, client = db) {
      await client.query('UPDATE task_comments SET content = $2 WHERE id = $1', [id, content]);
      return findById(id, client);
    },

    async delete(id, client = db) {
      const { rowCount } = await client.query('DELETE FROM task_comments WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
