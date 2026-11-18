import ApiError from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense in depth on top of SameSite cookies: rejects state-changing
 * requests whose Origin is neither the API itself nor an allowed frontend.
 */
export default function createCheckOrigin(allowedOrigins) {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || !origin) {
      return next();
    }

    let host;
    try {
      host = new URL(origin).host;
    } catch {
      return next(ApiError.forbidden('Origin not allowed'));
    }

    if (allowed.has(origin) || host === req.get('host')) {
      return next();
    }
    return next(ApiError.forbidden('Origin not allowed'));
  };
}
