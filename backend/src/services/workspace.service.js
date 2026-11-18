import ApiError from '../utils/ApiError.js';
import { emptyToNull } from '../utils/normalize.js';
import { MANAGER_ROLES, ROLES } from '../utils/roles.js';

export default function createWorkspaceService({
  workspaceRepository,
  memberRepository,
  userRepository,
  workspaceAccess,
  runInTransaction,
}) {
  return {
    async create(userId, { name, description = null }) {
      return runInTransaction(async (client) => {
        const workspace = await workspaceRepository.create(
          { name, description: emptyToNull(description), ownerId: userId },
          client,
        );
        await memberRepository.add(
          { workspaceId: workspace.id, userId, role: ROLES.OWNER },
          client,
        );
        return { ...workspace, role: ROLES.OWNER };
      });
    },

    listForUser(userId) {
      return workspaceRepository.findAllByUser(userId);
    },

    async getById(userId, workspaceId) {
      const { workspace, membership } = await workspaceAccess.requireRole(workspaceId, userId);
      const members = await memberRepository.findAllByWorkspace(workspaceId);
      return { ...workspace, role: membership.role, members };
    },

    async update(userId, workspaceId, changes) {
      await workspaceAccess.requireRole(workspaceId, userId, MANAGER_ROLES);
      const { name, description } = changes;
      return workspaceRepository.update(workspaceId, {
        name,
        description: description === undefined ? undefined : emptyToNull(description),
      });
    },

    async delete(userId, workspaceId) {
      await workspaceAccess.requireRole(workspaceId, userId, [ROLES.OWNER]);
      await workspaceRepository.delete(workspaceId);
    },

    async addMember(actorId, workspaceId, { email, role = ROLES.MEMBER }) {
      const { membership: actor } = await workspaceAccess.requireRole(
        workspaceId,
        actorId,
        MANAGER_ROLES,
      );
      if (role === ROLES.ADMIN && actor.role !== ROLES.OWNER) {
        throw ApiError.forbidden('Only the owner can add admins');
      }

      const user = await userRepository.findByEmail(email.trim().toLowerCase());
      if (!user) {
        throw ApiError.notFound('No user found with this email');
      }
      if (await memberRepository.find(workspaceId, user.id)) {
        throw ApiError.conflict('User is already a member of this workspace');
      }

      await memberRepository.add({ workspaceId, userId: user.id, role });
      return memberRepository.find(workspaceId, user.id);
    },

    async updateMemberRole(actorId, workspaceId, targetUserId, role) {
      await workspaceAccess.requireRole(workspaceId, actorId, [ROLES.OWNER]);

      const target = await memberRepository.find(workspaceId, targetUserId);
      if (!target) {
        throw ApiError.notFound('Member not found');
      }
      if (target.role === ROLES.OWNER) {
        throw ApiError.forbidden("The owner's role cannot be changed");
      }

      await memberRepository.updateRole(workspaceId, targetUserId, role);
      return { ...target, role };
    },

    async removeMember(actorId, workspaceId, targetUserId) {
      const { membership: actor } = await workspaceAccess.requireRole(workspaceId, actorId);

      const target = await memberRepository.find(workspaceId, targetUserId);
      if (!target) {
        throw ApiError.notFound('Member not found');
      }
      if (target.role === ROLES.OWNER) {
        throw ApiError.forbidden('The owner cannot be removed from the workspace');
      }

      const isSelf = actorId === targetUserId;
      const canRemove =
        isSelf ||
        actor.role === ROLES.OWNER ||
        (actor.role === ROLES.ADMIN && target.role === ROLES.MEMBER);
      if (!canRemove) {
        throw ApiError.forbidden();
      }

      await memberRepository.remove(workspaceId, targetUserId);
    },
  };
}
