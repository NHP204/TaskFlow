import { AUTH_COOKIE } from '../utils/authCookie.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';

export default function createAuthController({ authService, tokenService, cookieOptions }) {
  // The token only travels in an httpOnly cookie, never in the response body.
  function setAuthCookie(res, token) {
    res.cookie(AUTH_COOKIE, token, { ...cookieOptions, expires: tokenService.expiresAt(token) });
  }

  return {
    async register(req, res) {
      const { user, accessToken } = await authService.register(req.body);
      setAuthCookie(res, accessToken);
      sendCreated(res, { data: { user }, message: 'User registered successfully' });
    },

    async login(req, res) {
      const { user, accessToken } = await authService.login(req.body);
      setAuthCookie(res, accessToken);
      sendSuccess(res, { data: { user }, message: 'Logged in successfully' });
    },

    logout(req, res) {
      res.clearCookie(AUTH_COOKIE, cookieOptions);
      sendNoContent(res);
    },

    async me(req, res) {
      const user = await authService.getCurrentUser(req.user.id);
      sendSuccess(res, { data: user, message: 'Current user retrieved successfully' });
    },
  };
}
