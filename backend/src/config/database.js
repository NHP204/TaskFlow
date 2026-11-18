const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.isTest ? 5 : 10,
});

pool.on('error', (err) => {
  // An idle client errored (e.g. DB restarted). Log without connection details.
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  pool,
  /** Run a parameterized query on the shared pool. */
  query: (text, params) => pool.query(text, params),
  close: () => pool.end(),
};
