import { Router } from 'express';
import createHealthRouter from './health.routes.js';
import createAuthRouter from './auth.routes.js';
import createWorkspaceRouter from './workspace.routes.js';
import createProjectRouter from './project.routes.js';
import createTaskRouter from './task.routes.js';

export default function createApiRouter(container) {
  const router = Router();

  router.use('/health', createHealthRouter(container));
  router.use('/auth', createAuthRouter(container));
  router.use('/workspaces', createWorkspaceRouter(container));
  router.use('/projects', createProjectRouter(container));
  router.use('/tasks', createTaskRouter(container));

  return router;
}
