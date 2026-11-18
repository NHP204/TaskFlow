// Usage: node scripts/migrate.js [up|down]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runner } from 'node-pg-migrate';
import env from '../src/config/env.js';

export default function migrate(direction = 'up', { log = console.log } = {}) {
  return runner({
    databaseUrl: env.databaseUrl,
    dir: path.resolve(import.meta.dirname, '../migrations'),
    direction,
    count: direction === 'down' ? 1 : Infinity,
    migrationsTable: 'pgmigrations',
    log,
  });
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const direction = process.argv[2] || 'up';
  if (!['up', 'down'].includes(direction)) {
    console.error('Usage: node scripts/migrate.js [up|down]');
    process.exit(1);
  }
  try {
    await migrate(direction);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
