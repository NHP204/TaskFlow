import { Router } from 'express';
import { sendSuccess, sendError } from '../utils/response.js';

export default function createHealthRouter({ db }) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      await db.query('SELECT 1');
      return sendSuccess(res, {
        data: { status: 'ok', database: 'up' },
        message: 'Service is healthy',
      });
    } catch {
      return sendError(res, { statusCode: 503, message: 'Database is unavailable' });
    }
  });

  return router;
}
