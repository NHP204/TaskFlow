import ApiError from '../utils/ApiError.js';
import { ALL_ROLES } from '../utils/roles.js';

/** Resource-level authorization shared by workspace, project and task services. */
export default function createWorkspaceAccess({ workspaceRepository, memberRepository }) {
  return {
    /** Returns the user's membership, or throws 404 / 403. */
    async requireRole(workspaceId, userId, allowedRoles = ALL_ROLES) {
      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) {
        throw ApiError.notFound('Workspace not found');
      }

      const membership = await memberRepository.find(workspaceId, userId);
      if (!membership) {
        throw ApiError.forbidden('You are not a member of this workspace');
      }
      if (!allowedRoles.includes(membership.role)) {
        throw ApiError.forbidden();
      }

      return { workspace, membership };
    },
  };
}
