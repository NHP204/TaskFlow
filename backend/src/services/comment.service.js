import ApiError from '../utils/ApiError.js';
import { paginationMeta, toOffset } from '../utils/pagination.js';
import { MANAGER_ROLES } from '../utils/roles.js';

export default function createCommentService({
  commentRepository,
  taskRepository,
  workspaceAccess,
}) {
  async function findTask(userId, taskId) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }
    await workspaceAccess.requireRole(task.workspaceId, userId);
    return task;
  }

  async function findComment(userId, commentId) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }
    const { membership } = await workspaceAccess.requireRole(comment.workspaceId, userId);
    return { comment, membership };
  }

  const publicComment = ({ workspaceId, ...comment }) => comment;

  return {
    async create(userId, taskId, { content }) {
      await findTask(userId, taskId);
      const comment = await commentRepository.create({ taskId, userId, content });
      return publicComment(comment);
    },

    async listByTask(userId, taskId, { page, limit }) {
      await findTask(userId, taskId);
      const { items, total } = await commentRepository.findByTask(taskId, {
        limit,
        offset: toOffset({ page, limit }),
      });
      return { items, meta: paginationMeta({ page, limit }, total) };
    },

    async update(userId, commentId, { content }) {
      const { comment } = await findComment(userId, commentId);
      if (comment.author.id !== userId) {
        throw ApiError.forbidden('Only the author can edit this comment');
      }
      return publicComment(await commentRepository.update(commentId, content));
    },

    async delete(userId, commentId) {
      const { comment, membership } = await findComment(userId, commentId);
      if (comment.author.id !== userId && !MANAGER_ROLES.includes(membership.role)) {
        throw ApiError.forbidden('Only the author or a manager can delete this comment');
      }
      await commentRepository.delete(commentId);
    },
  };
}
