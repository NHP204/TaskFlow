import { sendSuccess } from '../utils/response.js';

export default function createStatsController(statsService) {
  return {
    async project(req, res) {
      const stats = await statsService.forProject(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: stats, message: 'Project statistics retrieved successfully' });
    },

    async workspace(req, res) {
      const stats = await statsService.forWorkspace(req.user.id, req.validated.params.id);
      sendSuccess(res, { data: stats, message: 'Workspace statistics retrieved successfully' });
    },
  };
}
