import { Router } from 'express';
import createHealthRouter from './health.routes.js';
import createAuthRouter from './auth.routes.js';

export default function createApiRouter(container) {
  const router = Router();

  router.use('/health', createHealthRouter(container));
  router.use('/auth', createAuthRouter(container));

  return router;
}
