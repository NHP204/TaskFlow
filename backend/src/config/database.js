import pg from 'pg';
import env from './env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.isTest ? 5 : 10,
});

pool.on('error', (err) => {
  // An idle client errored (e.g. DB restarted). Log without connection details.
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const db = {
  pool,
  /** Run a parameterized query on the shared pool. */
  query: (text, params) => pool.query(text, params),
  close: () => pool.end(),
};

export default db;
