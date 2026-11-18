import ApiError from '../utils/ApiError.js';
import { ACTIVITY, diffFields } from '../utils/activity.js';
import { emptyToNull } from '../utils/normalize.js';
import { MANAGER_ROLES } from '../utils/roles.js';

export default function createProjectService({
  projectRepository,
  activityRepository,
  workspaceAccess,
  runInTransaction,
}) {
  async function findProject(projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }
    return project;
  }

  return {
    async create(userId, { workspaceId, name, description = null }) {
      await workspaceAccess.requireRole(workspaceId, userId, MANAGER_ROLES);

      return runInTransaction(async (client) => {
        const project = await projectRepository.create(
          { workspaceId, name, description: emptyToNull(description), createdBy: userId },
          client,
        );
        await activityRepository.create(
          {
            projectId: project.id,
            userId,
            action: ACTIVITY.PROJECT_CREATED,
            changes: { name: project.name },
          },
          client,
        );
        return project;
      });
    },

    async listByWorkspace(userId, workspaceId) {
      await workspaceAccess.requireRole(workspaceId, userId);
      return projectRepository.findAllByWorkspace(workspaceId);
    },

    async getById(userId, projectId) {
      const project = await findProject(projectId);
      await workspaceAccess.requireRole(project.workspaceId, userId);
      return project;
    },

    async update(userId, projectId, { name, description }) {
      const project = await findProject(projectId);
      await workspaceAccess.requireRole(project.workspaceId, userId, MANAGER_ROLES);

      const changes = {
        name,
        description: description === undefined ? undefined : emptyToNull(description),
      };
      const diff = diffFields(project, changes, ['name', 'description']);
      if (Object.keys(diff).length === 0) {
        return project;
      }

      return runInTransaction(async (client) => {
        const updated = await projectRepository.update(projectId, changes, client);
        await activityRepository.create(
          { projectId, userId, action: ACTIVITY.PROJECT_UPDATED, changes: diff },
          client,
        );
        return updated;
      });
    },

    async delete(userId, projectId) {
      const project = await findProject(projectId);
      await workspaceAccess.requireRole(project.workspaceId, userId, MANAGER_ROLES);
      await projectRepository.delete(projectId);
    },
  };
}
