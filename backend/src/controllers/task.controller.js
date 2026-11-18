import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';

export default function createTaskController(taskService) {
  return {
    async create(req, res) {
      const task = await taskService.create(req.user.id, req.body);
      sendCreated(res, { data: task, message: 'Task created successfully' });
    },

    async listByProject(req, res) {
      const { items, meta } = await taskService.listByProject(
        req.user.id,
        req.validated.params.id,
        req.validated.query,
      );
      sendSuccess(res, { data: items, meta, message: 'Tasks retrieved successfully' });
    },

    async getById(req, res) {
      const task = await taskService.getById(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: task, message: 'Task retrieved successfully' });
    },

    async update(req, res) {
      const task = await taskService.update(req.user.id, req.validated.params.id, req.body);
      sendSuccess(res, { data: task, message: 'Task updated successfully' });
    },

    async delete(req, res) {
      await taskService.delete(req.user.id, req.validated.params.id);
      sendNoContent(res);
    },

    async listActivity(req, res) {
      const { items, meta } = await taskService.listActivity(
        req.user.id,
        req.validated.params.id,
        req.validated.query,
      );
      sendSuccess(res, { data: items, meta, message: 'Task activity retrieved successfully' });
    },
  };
}
