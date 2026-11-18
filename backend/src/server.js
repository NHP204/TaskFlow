import env from './config/env.js';
import db from './config/database.js';
import createApp from './app.js';

const app = createApp({ db, env });

const server = app.listen(env.port, () => {
  console.log(`TaskFlow API listening on port ${env.port} (${env.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
