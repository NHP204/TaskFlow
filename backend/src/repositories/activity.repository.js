function toActivity(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    action: row.action,
    changes: row.changes,
    createdAt: row.created_at,
    user: row.user_id ? { id: row.user_id, fullName: row.full_name } : null,
  };
}

export default function createActivityRepository(db) {
  return {
    async create({ projectId, taskId = null, userId, action, changes = null }, client = db) {
      await client.query(
        `INSERT INTO activity_logs (project_id, task_id, user_id, action, changes)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, taskId, userId, action, changes],
      );
    },

    async findByTask(taskId, { limit, offset }, client = db) {
      const { rows } = await client.query(
        `SELECT a.id, a.project_id, a.task_id, a.user_id, a.action, a.changes, a.created_at,
                u.full_name, COUNT(*) OVER () AS total
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE a.task_id = $1
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT $2 OFFSET $3`,
        [taskId, limit, offset],
      );
      return { items: rows.map(toActivity), total: rows.length ? Number(rows[0].total) : 0 };
    },
  };
}
