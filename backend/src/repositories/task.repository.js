const TASK_COLUMNS = `
  t.id, t.project_id, p.workspace_id, t.title, t.description, t.status,
  t.assignee_id, t.created_by, t.due_date, t.created_at, t.updated_at,
  u.email AS assignee_email, u.full_name AS assignee_name`;

const TASK_FROM = `
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id = t.assignee_id`;

// Whitelisted columns for writes and sorting; user input never reaches SQL directly.
const WRITABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  status: 'status',
  assigneeId: 'assignee_id',
  dueDate: 'due_date',
};

const SORT_COLUMNS = {
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
  dueDate: 't.due_date',
  title: 't.title',
  status: `CASE t.status WHEN 'TODO' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END`,
};

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    assignee: row.assignee_id
      ? { id: row.assignee_id, email: row.assignee_email, fullName: row.assignee_name }
      : null,
    createdBy: row.created_by,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

function buildFilters(projectId, filters) {
  const params = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const conditions = [`t.project_id = ${param(projectId)}`];
  if (filters.status) conditions.push(`t.status = ${param(filters.status)}`);
  if (filters.assigneeId) conditions.push(`t.assignee_id = ${param(filters.assigneeId)}`);
  if (filters.dueDate) conditions.push(`t.due_date = ${param(filters.dueDate)}`);
  if (filters.dueFrom) conditions.push(`t.due_date >= ${param(filters.dueFrom)}`);
  if (filters.dueTo) conditions.push(`t.due_date <= ${param(filters.dueTo)}`);
  if (filters.search) {
    const pattern = param(`%${escapeLike(filters.search)}%`);
    conditions.push(`(t.title ILIKE ${pattern} OR t.description ILIKE ${pattern})`);
  }

  return { where: conditions.join(' AND '), params, param };
}

export default function createTaskRepository(db) {
  async function findById(id, client = db, { forUpdate = false } = {}) {
    const { rows } = await client.query(
      `SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE t.id = $1 ${forUpdate ? 'FOR UPDATE OF t' : ''}`,
      [id],
    );
    return toTask(rows[0]);
  }

  return {
    findById,

    async create(data, client = db) {
      const { rows } = await client.query(
        `INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          data.projectId,
          data.title,
          data.description,
          data.status,
          data.assigneeId,
          data.dueDate,
          data.createdBy,
        ],
      );
      return findById(rows[0].id, client);
    },

    async update(id, changes, client = db) {
      const sets = [];
      const params = [id];
      for (const [field, column] of Object.entries(WRITABLE_COLUMNS)) {
        if (changes[field] !== undefined) {
          params.push(changes[field]);
          sets.push(`${column} = $${params.length}`);
        }
      }
      if (sets.length > 0) {
        await client.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $1`, params);
      }
      return findById(id, client);
    },

    async delete(id, client = db) {
      const { rowCount } = await client.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount > 0;
    },

    /** Filtered, sorted and paginated tasks of a project: { items, total }. */
    async findByProject(projectId, { sortBy, order, limit, offset, ...filters }, client = db) {
      const { where, params, param } = buildFilters(projectId, filters);
      const direction = order === 'asc' ? 'ASC' : 'DESC';
      const sortColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.createdAt;

      // COUNT(*) OVER () is computed before LIMIT, so one query returns page + total.
      const { rows } = await client.query(
        `SELECT ${TASK_COLUMNS}, COUNT(*) OVER () AS total
         ${TASK_FROM}
         WHERE ${where}
         ORDER BY ${sortColumn} ${direction} NULLS LAST, t.id ${direction}
         LIMIT ${param(limit)} OFFSET ${param(offset)}`,
        params,
      );
      if (rows.length > 0 || offset === 0) {
        return { items: rows.map(toTask), total: rows.length ? Number(rows[0].total) : 0 };
      }

      // Page past the end: still report the real total.
      const count = await client.query(
        `SELECT COUNT(*) AS total ${TASK_FROM} WHERE ${where}`,
        params.slice(0, -2),
      );
      return { items: [], total: Number(count.rows[0].total) };
    },

    async unassignUserInWorkspace(workspaceId, userId, client = db) {
      await client.query(
        `UPDATE tasks SET assignee_id = NULL
         WHERE assignee_id = $2
           AND project_id IN (SELECT id FROM projects WHERE workspace_id = $1)`,
        [workspaceId, userId],
      );
    },
  };
}
