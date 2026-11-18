import ApiError from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';

// Fallback for PostgreSQL constraint errors not handled in services.
const PG_ERROR_MAP = {
  23505: { statusCode: 409, message: 'Resource already exists' },
  23503: { statusCode: 400, message: 'Referenced resource does not exist' },
  23514: { statusCode: 400, message: 'Value violates a data constraint' },
  '22P02': { statusCode: 400, message: 'Invalid input syntax' },
};

export default function createErrorHandler({ logger = console, exposeStack = false } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    if (err instanceof ApiError) {
      return sendError(res, {
        statusCode: err.statusCode,
        message: err.message,
        errors: err.errors,
      });
    }

    if (err.type === 'entity.parse.failed') {
      return sendError(res, { statusCode: 400, message: 'Malformed JSON in request body' });
    }
    if (err.type === 'entity.too.large') {
      return sendError(res, { statusCode: 413, message: 'Request body is too large' });
    }

    const pgError = err.code && PG_ERROR_MAP[err.code];
    if (pgError) {
      return sendError(res, pgError);
    }

    logger.error(`[${req.method} ${req.originalUrl}]`, exposeStack ? err.stack : err.message);
    return sendError(res, { statusCode: 500, message: 'Internal server error' });
  };
}
