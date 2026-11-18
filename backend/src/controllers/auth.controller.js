import { sendCreated, sendSuccess } from '../utils/response.js';

export default function createAuthController(authService) {
  return {
    async register(req, res) {
      const result = await authService.register(req.body);
      sendCreated(res, { data: result, message: 'User registered successfully' });
    },

    async login(req, res) {
      const result = await authService.login(req.body);
      sendSuccess(res, { data: result, message: 'Logged in successfully' });
    },

    async me(req, res) {
      const user = await authService.getCurrentUser(req.user.id);
      sendSuccess(res, { data: user, message: 'Current user retrieved successfully' });
    },
  };
}
