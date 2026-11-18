import ApiError from '../utils/ApiError.js';

/** Requires a Bearer token and sets req.user = { id }. */
export default function createAuthenticate(tokenService) {
  return (req, res, next) => {
    const [scheme, token] = (req.get('authorization') || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(ApiError.unauthorized('Missing or invalid Authorization header'));
    }

    req.user = { id: tokenService.verify(token) };
    return next();
  };
}
