import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import createContainer from './container.js';
import createApiRouter from './routes/index.js';
import notFound from './middlewares/notFound.js';
import createErrorHandler from './middlewares/errorHandler.js';

/** Builds the Express app with injected dependencies. */
export default function createApp({ db, env, logger = console }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : false }));
  app.use(express.json({ limit: '100kb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use('/api/v1', createApiRouter(createContainer({ db, env })));

  app.use(notFound);
  app.use(createErrorHandler({ logger, exposeStack: !env.isProduction }));

  return app;
}
