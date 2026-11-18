import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

export default function createAuthRouter({ authController, authenticate }) {
  const router = Router();

  router.post('/register', validate(registerSchema), authController.register);
  router.post('/login', validate(loginSchema), authController.login);
  router.post('/logout', authController.logout);
  router.get('/me', authenticate, authController.me);

  return router;
}
