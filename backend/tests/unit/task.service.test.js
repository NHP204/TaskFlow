import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import createTaskService from '../../src/services/task.service.js';
import createWorkspaceAccess from '../../src/services/workspaceAccess.js';

const WS_ID = 10;
const PROJECT_ID = 20;
const TASK_ID = 30;
const users = { owner: 1, member: 2, creator: 3, assignee: 4, outsider: 5 };

const roles = {
  [users.owner]: 'OWNER',
  [users.member]: 'MEMBER',
  [users.creator]: 'MEMBER',
  [users.assignee]: 'MEMBER',
};

const baseTask = {
  id: TASK_ID,
  projectId: PROJECT_ID,
  workspaceId: WS_ID,
  title: 'Write docs',
  description: null,
  status: 'TODO',
  assigneeId: users.assignee,
  createdBy: users.creator,
  dueDate: '2030-01-10',
};

describe('taskService', () => {
  let taskRepository;
  let activityRepository;
  let service;
  const client = {};

  beforeEach(() => {
    const workspaceRepository = { findById: jest.fn(async () => ({ id: WS_ID })) };
    const memberRepository = {
      find: jest.fn(async (wsId, userId) =>
        roles[userId] ? { workspaceId: wsId, userId, role: roles[userId] } : null,
      ),
    };
    taskRepository = {
      findById: jest.fn(async () => ({ ...baseTask })),
      create: jest.fn(async (data) => ({ id: TASK_ID, workspaceId: WS_ID, ...data })),
      update: jest.fn(async (id, changes) => ({ ...baseTask, ...changes })),
      delete: jest.fn(),
    };
    activityRepository = { create: jest.fn() };

    service = createTaskService({
      taskRepository,
      projectRepository: {
        findById: jest.fn(async (id) =>
          id === PROJECT_ID ? { id: PROJECT_ID, workspaceId: WS_ID } : null,
        ),
      },
      memberRepository,
      activityRepository,
      workspaceAccess: createWorkspaceAccess({ workspaceRepository, memberRepository }),
      runInTransaction: (work) => work(client),
      now: () => new Date(2030, 0, 1),
    });
  });

  describe('create', () => {
    it('creates a TODO task and logs TASK_CREATED in the same transaction', async () => {
      await service.create(users.member, { projectId: PROJECT_ID, title: 'New' });

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'TODO', createdBy: users.member, assigneeId: null }),
        client,
      );
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_CREATED', taskId: TASK_ID }),
        client,
      );
    });

    it('rejects users outside the workspace (403)', async () => {
      await expect(
        service.create(users.outsider, { projectId: PROJECT_ID, title: 'x' }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a project that does not exist (404)', async () => {
      await expect(
        service.create(users.member, { projectId: 999, title: 'x' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects an assignee who is not a workspace member (400)', async () => {
      await expect(
        service.create(users.member, {
          projectId: PROJECT_ID,
          title: 'x',
          assigneeId: users.outsider,
        }),
      ).rejects.toMatchObject({ statusCode: 400, errors: [{ field: 'assigneeId' }] });
    });

    it('rejects a due date in the past (400)', async () => {
      await expect(
        service.create(users.member, { projectId: PROJECT_ID, title: 'x', dueDate: '2029-12-31' }),
      ).rejects.toMatchObject({ statusCode: 400, errors: [{ field: 'dueDate' }] });

      await expect(
        service.create(users.member, { projectId: PROJECT_ID, title: 'x', dueDate: '2030-01-01' }),
      ).resolves.toBeDefined();
    });
  });

  describe('access to existing tasks', () => {
    it('forbids non-members from reading a task (403)', async () => {
      await expect(service.getById(users.outsider, TASK_ID)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('returns 404 when the task does not exist', async () => {
      taskRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getById(users.owner, 999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('update', () => {
    it.each([
      ['owner', users.owner],
      ['creator', users.creator],
      ['assignee', users.assignee],
    ])('lets the %s update the task', async (_label, userId) => {
      await service.update(userId, TASK_ID, { status: 'IN_PROGRESS' });
      expect(taskRepository.update).toHaveBeenCalledWith(
        TASK_ID,
        { status: 'IN_PROGRESS' },
        client,
      );
    });

    it('forbids other members from updating (403)', async () => {
      await expect(service.update(users.member, TASK_ID, { status: 'DONE' })).rejects.toMatchObject(
        { statusCode: 403 },
      );
    });

    it('logs only the fields that changed, with from/to values', async () => {
      await service.update(users.owner, TASK_ID, { title: 'Write docs', status: 'DONE' });

      expect(taskRepository.update).toHaveBeenCalledWith(TASK_ID, { status: 'DONE' }, client);
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_UPDATED',
          changes: { status: { from: 'TODO', to: 'DONE' } },
        }),
        client,
      );
    });

    it('skips the write and the log when nothing changed', async () => {
      await service.update(users.owner, TASK_ID, { status: 'TODO' });
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(activityRepository.create).not.toHaveBeenCalled();
    });

    it('rejects reassigning to a non-member (400)', async () => {
      await expect(
        service.update(users.owner, TASK_ID, { assigneeId: users.outsider }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows unassigning and clearing the due date', async () => {
      await service.update(users.owner, TASK_ID, { assigneeId: null, dueDate: null });
      expect(taskRepository.update).toHaveBeenCalledWith(
        TASK_ID,
        { assigneeId: null, dueDate: null },
        client,
      );
    });
  });

  describe('delete', () => {
    it('lets the creator delete and logs TASK_DELETED before removing the row', async () => {
      await service.delete(users.creator, TASK_ID);

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_DELETED', changes: { title: 'Write docs' } }),
        client,
      );
      expect(taskRepository.delete).toHaveBeenCalledWith(TASK_ID, client);
    });

    it('forbids the assignee (not creator, not manager) from deleting (403)', async () => {
      await expect(service.delete(users.assignee, TASK_ID)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(taskRepository.delete).not.toHaveBeenCalled();
    });
  });
});
