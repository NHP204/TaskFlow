import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';

export default function createProjectController(projectService) {
  return {
    async create(req, res) {
      const project = await projectService.create(req.user.id, req.body);
      sendCreated(res, { data: project, message: 'Project created successfully' });
    },

    async listByWorkspace(req, res) {
      const projects = await projectService.listByWorkspace(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: projects, message: 'Projects retrieved successfully' });
    },

    async getById(req, res) {
      const project = await projectService.getById(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: project, message: 'Project retrieved successfully' });
    },

    async update(req, res) {
      const project = await projectService.update(req.user.id, req.validated.params.id, req.body);
      sendSuccess(res, { data: project, message: 'Project updated successfully' });
    },

    async delete(req, res) {
      await projectService.delete(req.user.id, req.validated.params.id);
      sendNoContent(res);
    },
  };
}
