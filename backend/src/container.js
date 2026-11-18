import createUserRepository from './repositories/user.repository.js';
import createWorkspaceRepository from './repositories/workspace.repository.js';
import createWorkspaceMemberRepository from './repositories/workspaceMember.repository.js';
import createAuthService from './services/auth.service.js';
import createWorkspaceAccess from './services/workspaceAccess.js';
import createWorkspaceService from './services/workspace.service.js';
import createAuthController from './controllers/auth.controller.js';
import createWorkspaceController from './controllers/workspace.controller.js';
import createAuthenticate from './middlewares/authenticate.js';
import createPasswordHasher from './utils/password.js';
import createTokenService from './utils/token.js';
import { withTransaction } from './utils/transaction.js';

/** Wires repositories, services and controllers together. */
export default function createContainer({ db, env }) {
  const runInTransaction = (work) => withTransaction(db.pool, work);

  const userRepository = createUserRepository(db);
  const workspaceRepository = createWorkspaceRepository(db);
  const memberRepository = createWorkspaceMemberRepository(db);

  const passwordHasher = createPasswordHasher({ saltRounds: env.bcryptSaltRounds });
  const tokenService = createTokenService(env.jwt);
  const workspaceAccess = createWorkspaceAccess({ workspaceRepository, memberRepository });

  const authService = createAuthService({ userRepository, passwordHasher, tokenService });
  const workspaceService = createWorkspaceService({
    workspaceRepository,
    memberRepository,
    userRepository,
    workspaceAccess,
    runInTransaction,
  });

  return {
    db,
    authenticate: createAuthenticate(tokenService),
    authController: createAuthController(authService),
    workspaceController: createWorkspaceController(workspaceService),
  };
}
