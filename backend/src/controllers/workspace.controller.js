import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';

export default function createWorkspaceController(workspaceService) {
  return {
    async create(req, res) {
      const workspace = await workspaceService.create(req.user.id, req.body);
      sendCreated(res, { data: workspace, message: 'Workspace created successfully' });
    },

    async list(req, res) {
      const workspaces = await workspaceService.listForUser(req.user.id);
      sendSuccess(res, { data: workspaces, message: 'Workspaces retrieved successfully' });
    },

    async getById(req, res) {
      const workspace = await workspaceService.getById(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: workspace, message: 'Workspace retrieved successfully' });
    },

    async update(req, res) {
      const workspace = await workspaceService.update(
        req.user.id,
        req.validated.params.id,
        req.body,
      );
      sendSuccess(res, { data: workspace, message: 'Workspace updated successfully' });
    },

    async delete(req, res) {
      await workspaceService.delete(req.user.id, req.validated.params.id);
      sendNoContent(res);
    },

    async addMember(req, res) {
      const member = await workspaceService.addMember(
        req.user.id,
        req.validated.params.id,
        req.body,
      );
      sendCreated(res, { data: member, message: 'Member added successfully' });
    },

    async updateMember(req, res) {
      const { id, userId } = req.validated.params;
      const member = await workspaceService.updateMemberRole(
        req.user.id,
        id,
        userId,
        req.body.role,
      );
      sendSuccess(res, { data: member, message: 'Member role updated successfully' });
    },

    async removeMember(req, res) {
      const { id, userId } = req.validated.params;
      await workspaceService.removeMember(req.user.id, id, userId);
      sendNoContent(res);
    },
  };
}
