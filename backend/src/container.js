import createUserRepository from './repositories/user.repository.js';
import createAuthService from './services/auth.service.js';
import createAuthController from './controllers/auth.controller.js';
import createAuthenticate from './middlewares/authenticate.js';
import createPasswordHasher from './utils/password.js';
import createTokenService from './utils/token.js';

/** Wires repositories, services and controllers together. */
export default function createContainer({ db, env }) {
  const userRepository = createUserRepository(db);

  const passwordHasher = createPasswordHasher({ saltRounds: env.bcryptSaltRounds });
  const tokenService = createTokenService(env.jwt);

  const authService = createAuthService({ userRepository, passwordHasher, tokenService });

  return {
    db,
    authenticate: createAuthenticate(tokenService),
    authController: createAuthController(authService),
  };
}
