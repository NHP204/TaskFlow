/**
 * Migration CLI that reuses the app's env loading, so the same command works
 * for development (.env) and tests (NODE_ENV=test -> .env.test).
 *
 *   node scripts/migrate.js up      # apply all pending migrations
 *   node scripts/migrate.js down    # roll back the last migration
 */
const path = require('path');

async function migrate(direction = 'up', { log = console.log } = {}) {
  const env = require('../src/config/env');
  // node-pg-migrate is ESM-only; load it from CommonJS via dynamic import.
  const { runner } = await import('node-pg-migrate');

  return runner({
    databaseUrl: env.databaseUrl,
    dir: path.resolve(__dirname, '../migrations'),
    direction,
    count: direction === 'down' ? 1 : Infinity,
    migrationsTable: 'pgmigrations',
    log,
  });
}

if (require.main === module) {
  const direction = process.argv[2] || 'up';
  if (!['up', 'down'].includes(direction)) {
    console.error('Usage: node scripts/migrate.js [up|down]');
    process.exit(1);
  }
  migrate(direction)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}

module.exports = migrate;
