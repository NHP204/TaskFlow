const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const createApiRouter = require('./routes');
const notFound = require('./middlewares/notFound');
const createErrorHandler = require('./middlewares/errorHandler');

/**
 * Builds the Express app. Dependencies are injected so tests can supply
 * their own database / logger instead of the real ones.
 */
function createApp({ db, env, logger = console }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : false }));
  app.use(express.json({ limit: '100kb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use('/api/v1', createApiRouter({ db, env }));

  app.use(notFound);
  app.use(createErrorHandler({ logger, exposeStack: !env.isProduction }));

  return app;
}

module.exports = createApp;
