const env = require('./config/env');
const db = require('./config/database');
const createApp = require('./app');

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
  // Force exit if open connections do not close in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
