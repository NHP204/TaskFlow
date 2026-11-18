import ApiError from '../utils/ApiError.js';
import { ACTIVITY, diffFields } from '../utils/activity.js';
import { toDateString } from '../utils/date.js';
import { emptyToNull } from '../utils/normalize.js';
import { toOffset, paginationMeta } from '../utils/pagination.js';
import { MANAGER_ROLES } from '../utils/roles.js';

const TRACKED_FIELDS = ['title', 'description', 'status', 'assigneeId', 'dueDate'];

export default function createTaskService({
  taskRepository,
  projectRepository,
  memberRepository,
  activityRepository,
  workspaceAccess,
  runInTransaction,
  now = () => new Date(),
}) {
  async function findProject(projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }
    return project;
  }

  async function findTaskWithAccess(userId, taskId) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }
    const { membership } = await workspaceAccess.requireRole(task.workspaceId, userId);
    return { task, membership };
  }

  async function assertAssignee(workspaceId, assigneeId) {
    if (assigneeId === null || assigneeId === undefined) return;
    const member = await memberRepository.find(workspaceId, assigneeId);
    if (!member) {
      throw ApiError.badRequest('Assignee must be a member of this workspace', [
        { field: 'assigneeId', message: 'Assignee must be a member of this workspace' },
      ]);
    }
  }

  function assertDueDate(dueDate) {
    if (dueDate && dueDate < toDateString(now())) {
      throw ApiError.badRequest('Due date cannot be in the past', [
        { field: 'dueDate', message: 'Due date cannot be in the past' },
      ]);
    }
  }

  const isManager = (membership) => MANAGER_ROLES.includes(membership.role);

  return {
    async create(userId, data) {
      const project = await findProject(data.projectId);
      await workspaceAccess.requireRole(project.workspaceId, userId);

      const assigneeId = data.assigneeId ?? null;
      const dueDate = data.dueDate ?? null;
      await assertAssignee(project.workspaceId, assigneeId);
      assertDueDate(dueDate);

      return runInTransaction(async (client) => {
        const task = await taskRepository.create(
          {
            projectId: project.id,
            title: data.title,
            description: emptyToNull(data.description ?? null),
            status: data.status ?? 'TODO',
            assigneeId,
            dueDate,
            createdBy: userId,
          },
          client,
        );
        await activityRepository.create(
          {
            projectId: project.id,
            taskId: task.id,
            userId,
            action: ACTIVITY.TASK_CREATED,
            changes: { title: task.title, status: task.status, assigneeId, dueDate },
          },
          client,
        );
        return task;
      });
    },

    async listByProject(userId, projectId, query) {
      const project = await findProject(projectId);
      await workspaceAccess.requireRole(project.workspaceId, userId);

      const { page, limit, ...filters } = query;
      const { items, total } = await taskRepository.findByProject(projectId, {
        ...filters,
        limit,
        offset: toOffset({ page, limit }),
      });
      return { items, meta: paginationMeta({ page, limit }, total) };
    },

    async getById(userId, taskId) {
      const { task } = await findTaskWithAccess(userId, taskId);
      return task;
    },

    async update(userId, taskId, data) {
      const { task, membership } = await findTaskWithAccess(userId, taskId);

      const canEdit =
        isManager(membership) || task.createdBy === userId || task.assigneeId === userId;
      if (!canEdit) {
        throw ApiError.forbidden('Only managers, the creator or the assignee can edit this task');
      }

      const changes = { ...data };
      if (changes.description !== undefined) changes.description = emptyToNull(changes.description);

      if (changes.assigneeId !== undefined && changes.assigneeId !== task.assigneeId) {
        await assertAssignee(task.workspaceId, changes.assigneeId);
      }
      if (changes.dueDate !== undefined && changes.dueDate !== task.dueDate) {
        assertDueDate(changes.dueDate);
      }

      return runInTransaction(async (client) => {
        // Lock the row so the logged "from" values match what is overwritten.
        const current = await taskRepository.findById(taskId, client, { forUpdate: true });
        if (!current) {
          throw ApiError.notFound('Task not found');
        }

        const diff = diffFields(current, changes, TRACKED_FIELDS);
        if (Object.keys(diff).length === 0) {
          return current;
        }

        const pending = Object.fromEntries(Object.keys(diff).map((key) => [key, changes[key]]));
        const updated = await taskRepository.update(taskId, pending, client);
        await activityRepository.create(
          {
            projectId: current.projectId,
            taskId,
            userId,
            action: ACTIVITY.TASK_UPDATED,
            changes: diff,
          },
          client,
        );
        return updated;
      });
    },

    async delete(userId, taskId) {
      const { task, membership } = await findTaskWithAccess(userId, taskId);

      if (!isManager(membership) && task.createdBy !== userId) {
        throw ApiError.forbidden('Only managers or the creator can delete this task');
      }

      await runInTransaction(async (client) => {
        await activityRepository.create(
          {
            projectId: task.projectId,
            taskId,
            userId,
            action: ACTIVITY.TASK_DELETED,
            changes: { title: task.title },
          },
          client,
        );
        await taskRepository.delete(taskId, client);
      });
    },

    async listActivity(userId, taskId, { page, limit }) {
      await findTaskWithAccess(userId, taskId);
      const { items, total } = await activityRepository.findByTask(taskId, {
        limit,
        offset: toOffset({ page, limit }),
      });
      return { items, meta: paginationMeta({ page, limit }, total) };
    },
  };
}
