import db from '../../src/config/database.js';

export async function resetDatabase() {
  await db.query(`
    TRUNCATE activity_logs, task_comments, tasks, projects,
             workspace_members, workspaces, users
    RESTART IDENTITY CASCADE
  `);
}

export default db;
