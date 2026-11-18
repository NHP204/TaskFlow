import ApiError from '../utils/ApiError.js';
import { AUTH_COOKIE } from '../utils/authCookie.js';

/** Requires a valid token in the auth cookie and sets req.user = { id }. */
export default function createAuthenticate(tokenService) {
  return (req, res, next) => {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    req.user = { id: tokenService.verify(token) };
    return next();
  };
}
