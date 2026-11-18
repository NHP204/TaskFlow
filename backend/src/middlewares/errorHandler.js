import ApiError from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';

// PostgreSQL error codes that map to client errors. Services should raise
// explicit ApiErrors first; this is a safety net for races (e.g. two requests
// inserting the same unique value at the same time).
const PG_ERROR_MAP = {
  23505: { statusCode: 409, message: 'Resource already exists' }, // unique_violation
  23503: { statusCode: 400, message: 'Referenced resource does not exist' }, // foreign_key_violation
  23514: { statusCode: 400, message: 'Value violates a data constraint' }, // check_violation
  '22P02': { statusCode: 400, message: 'Invalid input syntax' }, // invalid_text_representation
};

export default function createErrorHandler({ logger = console, exposeStack = false } = {}) {
  // Express recognizes error handlers by their 4-argument signature.
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    if (err instanceof ApiError) {
      return sendError(res, {
        statusCode: err.statusCode,
        message: err.message,
        errors: err.errors,
      });
    }

    // Body parser errors from express.json().
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

    // Unexpected error: log server-side only (never request bodies, which may
    // contain passwords or tokens) and return a generic message.
    logger.error(`[${req.method} ${req.originalUrl}]`, exposeStack ? err.stack : err.message);
    return sendError(res, { statusCode: 500, message: 'Internal server error' });
  };
}
