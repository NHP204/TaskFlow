import pg from 'pg';
import env from './env.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of local-time Date objects.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.isTest ? 5 : 10,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const db = {
  pool,
  query: (text, params) => pool.query(text, params),
  close: () => pool.end(),
};

export default db;
