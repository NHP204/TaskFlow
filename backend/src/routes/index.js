import { Router } from 'express';
import createHealthRouter from './health.routes.js';

export default function createApiRouter(deps) {
  const router = Router();
  router.use('/health', createHealthRouter(deps));
  return router;
}
