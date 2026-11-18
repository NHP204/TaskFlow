import { Router } from 'express';
import createHealthRouter from './health.routes.js';

/**
 * Root API router. Feature routers (auth, workspaces, projects, tasks) are
 * mounted here as they are implemented.
 */
export default function createApiRouter(deps) {
  const router = Router();
  router.use('/health', createHealthRouter(deps));
  return router;
}
