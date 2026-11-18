import createUserRepository from './repositories/user.repository.js';
import createWorkspaceRepository from './repositories/workspace.repository.js';
import createWorkspaceMemberRepository from './repositories/workspaceMember.repository.js';
import createProjectRepository from './repositories/project.repository.js';
import createTaskRepository from './repositories/task.repository.js';
import createActivityRepository from './repositories/activity.repository.js';
import createCommentRepository from './repositories/comment.repository.js';
import createAuthService from './services/auth.service.js';
import createWorkspaceAccess from './services/workspaceAccess.js';
import createWorkspaceService from './services/workspace.service.js';
import createProjectService from './services/project.service.js';
import createTaskService from './services/task.service.js';
import createCommentService from './services/comment.service.js';
import createAuthController from './controllers/auth.controller.js';
import createWorkspaceController from './controllers/workspace.controller.js';
import createProjectController from './controllers/project.controller.js';
import createTaskController from './controllers/task.controller.js';
import createCommentController from './controllers/comment.controller.js';
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
  const projectRepository = createProjectRepository(db);
  const taskRepository = createTaskRepository(db);
  const activityRepository = createActivityRepository(db);
  const commentRepository = createCommentRepository(db);

  const passwordHasher = createPasswordHasher({ saltRounds: env.bcryptSaltRounds });
  const tokenService = createTokenService(env.jwt);
  const workspaceAccess = createWorkspaceAccess({ workspaceRepository, memberRepository });

  const authService = createAuthService({ userRepository, passwordHasher, tokenService });
  const workspaceService = createWorkspaceService({
    workspaceRepository,
    memberRepository,
    userRepository,
    taskRepository,
    workspaceAccess,
    runInTransaction,
  });
  const projectService = createProjectService({
    projectRepository,
    activityRepository,
    workspaceAccess,
    runInTransaction,
  });
  const taskService = createTaskService({
    taskRepository,
    projectRepository,
    memberRepository,
    activityRepository,
    workspaceAccess,
    runInTransaction,
  });
  const commentService = createCommentService({
    commentRepository,
    taskRepository,
    workspaceAccess,
  });

  return {
    db,
    authenticate: createAuthenticate(tokenService),
    authController: createAuthController(authService),
    workspaceController: createWorkspaceController(workspaceService),
    projectController: createProjectController(projectService),
    taskController: createTaskController(taskService),
    commentController: createCommentController(commentService),
  };
}
