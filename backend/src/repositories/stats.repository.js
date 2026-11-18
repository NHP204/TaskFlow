// $2 is today's date, used for the overdue count.
const TASK_COUNTS = `
  COUNT(t.id) AS total,
  COUNT(t.id) FILTER (WHERE t.status = 'TODO') AS todo,
  COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress,
  COUNT(t.id) FILTER (WHERE t.status = 'DONE') AS done,
  COUNT(t.id) FILTER (WHERE t.status <> 'DONE' AND t.due_date < $2) AS overdue,
  COUNT(t.id) FILTER (WHERE t.assignee_id IS NULL) AS unassigned`;

function toCounts(row) {
  return {
    total: Number(row.total),
    todo: Number(row.todo),
    inProgress: Number(row.in_progress),
    done: Number(row.done),
    overdue: Number(row.overdue),
    unassigned: Number(row.unassigned),
  };
}

export default function createStatsRepository(db) {
  return {
    async countByProject(projectId, today, client = db) {
      const { rows } = await client.query(
        `SELECT ${TASK_COUNTS} FROM tasks t WHERE t.project_id = $1`,
        [projectId, today],
      );
      return toCounts(rows[0]);
    },

    async countByWorkspaceProjects(workspaceId, today, client = db) {
      const { rows } = await client.query(
        `SELECT p.id, p.name, ${TASK_COUNTS}
         FROM projects p
         LEFT JOIN tasks t ON t.project_id = p.id
         WHERE p.workspace_id = $1
         GROUP BY p.id
         ORDER BY p.created_at DESC, p.id DESC`,
        [workspaceId, today],
      );
      return rows.map((row) => ({ id: row.id, name: row.name, ...toCounts(row) }));
    },
  };
}
