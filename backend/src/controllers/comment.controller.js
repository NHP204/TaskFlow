import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';

export default function createCommentController(commentService) {
  return {
    async create(req, res) {
      const comment = await commentService.create(req.user.id, req.validated.params.id, req.body);
      sendCreated(res, { data: comment, message: 'Comment added successfully' });
    },

    async listByTask(req, res) {
      const { items, meta } = await commentService.listByTask(
        req.user.id,
        req.validated.params.id,
        req.validated.query,
      );
      sendSuccess(res, { data: items, meta, message: 'Comments retrieved successfully' });
    },

    async update(req, res) {
      const comment = await commentService.update(req.user.id, req.validated.params.id, req.body);
      sendSuccess(res, { data: comment, message: 'Comment updated successfully' });
    },

    async delete(req, res) {
      await commentService.delete(req.user.id, req.validated.params.id);
      sendNoContent(res);
    },
  };
}
