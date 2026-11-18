import migrate from '../../scripts/migrate.js';
import env from '../../src/config/env.js';

export default async function globalSetup() {
  if (!env.isTest) {
    throw new Error('Tests must run with NODE_ENV=test (use `npm test`).');
  }
  await migrate('up', { log: () => {} });
}
