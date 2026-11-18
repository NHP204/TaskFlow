const { Router } = require('express');
const createHealthRouter = require('./health.routes');

/**
 * Root API router. Feature routers (auth, workspaces, projects, tasks) are
 * mounted here as they are implemented.
 */
function createApiRouter(deps) {
  const router = Router();
  router.use('/health', createHealthRouter(deps));
  return router;
}

module.exports = createApiRouter;
