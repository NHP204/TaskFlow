import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import createWorkspaceService from '../../src/services/workspace.service.js';
import createWorkspaceAccess from '../../src/services/workspaceAccess.js';

const WS_ID = 10;
const OWNER_ID = 1;
const ADMIN_ID = 2;
const MEMBER_ID = 3;
const OUTSIDER_ID = 4;

const members = {
  [OWNER_ID]: { workspaceId: WS_ID, userId: OWNER_ID, role: 'OWNER' },
  [ADMIN_ID]: { workspaceId: WS_ID, userId: ADMIN_ID, role: 'ADMIN' },
  [MEMBER_ID]: { workspaceId: WS_ID, userId: MEMBER_ID, role: 'MEMBER' },
};

describe('workspaceService', () => {
  let workspaceRepository;
  let memberRepository;
  let userRepository;
  let taskRepository;
  let service;
  const client = { name: 'tx-client' };

  beforeEach(() => {
    workspaceRepository = {
      create: jest.fn(async (data) => ({ id: WS_ID, ...data })),
      findById: jest.fn(async (id) => (id === WS_ID ? { id: WS_ID, name: 'WS' } : null)),
      update: jest.fn(async (id, changes) => ({ id, ...changes })),
      delete: jest.fn(async () => true),
    };
    memberRepository = {
      find: jest.fn(async (wsId, userId) => (wsId === WS_ID ? (members[userId] ?? null) : null)),
      findAllByWorkspace: jest.fn(async () => Object.values(members)),
      add: jest.fn(async (data) => data),
      updateRole: jest.fn(),
      remove: jest.fn(async () => true),
    };
    userRepository = {
      findByEmail: jest.fn(async (email) =>
        email === 'outsider@example.com' ? { id: OUTSIDER_ID, email } : null,
      ),
    };

    taskRepository = { unassignUserInWorkspace: jest.fn() };

    service = createWorkspaceService({
      workspaceRepository,
      memberRepository,
      userRepository,
      taskRepository,
      workspaceAccess: createWorkspaceAccess({ workspaceRepository, memberRepository }),
      runInTransaction: (work) => work(client),
    });
  });

  describe('create', () => {
    it('creates the workspace and its OWNER membership in one transaction', async () => {
      const result = await service.create(OWNER_ID, { name: 'WS', description: '' });

      expect(workspaceRepository.create).toHaveBeenCalledWith(
        { name: 'WS', description: null, ownerId: OWNER_ID },
        client,
      );
      expect(memberRepository.add).toHaveBeenCalledWith(
        { workspaceId: WS_ID, userId: OWNER_ID, role: 'OWNER' },
        client,
      );
      expect(result.role).toBe('OWNER');
    });
  });

  describe('access control', () => {
    it('returns 404 for a workspace that does not exist', async () => {
      await expect(service.getById(OWNER_ID, 999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('forbids non-members from reading the workspace', async () => {
      await expect(service.getById(OUTSIDER_ID, WS_ID)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('forbids MEMBER from updating the workspace', async () => {
      await expect(service.update(MEMBER_ID, WS_ID, { name: 'x' })).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(workspaceRepository.update).not.toHaveBeenCalled();
    });

    it('allows ADMIN to update but only OWNER to delete', async () => {
      await expect(service.update(ADMIN_ID, WS_ID, { name: 'New' })).resolves.toMatchObject({
        name: 'New',
      });
      await expect(service.delete(ADMIN_ID, WS_ID)).rejects.toMatchObject({ statusCode: 403 });
      await expect(service.delete(OWNER_ID, WS_ID)).resolves.toBeUndefined();
    });
  });

  describe('addMember', () => {
    it('forbids MEMBER from adding members', async () => {
      await expect(
        service.addMember(MEMBER_ID, WS_ID, { email: 'outsider@example.com' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows ADMIN to add a MEMBER but not an ADMIN', async () => {
      await service.addMember(ADMIN_ID, WS_ID, { email: 'outsider@example.com', role: 'MEMBER' });
      expect(memberRepository.add).toHaveBeenCalledWith({
        workspaceId: WS_ID,
        userId: OUTSIDER_ID,
        role: 'MEMBER',
      });

      await expect(
        service.addMember(ADMIN_ID, WS_ID, { email: 'outsider@example.com', role: 'ADMIN' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('returns 404 for an unknown email and 409 for an existing member', async () => {
      await expect(
        service.addMember(OWNER_ID, WS_ID, { email: 'ghost@example.com' }),
      ).rejects.toMatchObject({ statusCode: 404 });

      userRepository.findByEmail.mockResolvedValueOnce({ id: MEMBER_ID });
      await expect(
        service.addMember(OWNER_ID, WS_ID, { email: 'member@example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updateMemberRole', () => {
    it('only lets the OWNER change roles', async () => {
      await expect(
        service.updateMemberRole(ADMIN_ID, WS_ID, MEMBER_ID, 'ADMIN'),
      ).rejects.toMatchObject({ statusCode: 403 });

      await expect(
        service.updateMemberRole(OWNER_ID, WS_ID, MEMBER_ID, 'ADMIN'),
      ).resolves.toMatchObject({ userId: MEMBER_ID, role: 'ADMIN' });
    });

    it("never changes the OWNER's role", async () => {
      await expect(
        service.updateMemberRole(OWNER_ID, WS_ID, OWNER_ID, 'MEMBER'),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(memberRepository.updateRole).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it.each([
      ['OWNER removes ADMIN', OWNER_ID, ADMIN_ID],
      ['OWNER removes MEMBER', OWNER_ID, MEMBER_ID],
      ['ADMIN removes MEMBER', ADMIN_ID, MEMBER_ID],
      ['MEMBER leaves', MEMBER_ID, MEMBER_ID],
      ['ADMIN leaves', ADMIN_ID, ADMIN_ID],
    ])('allows: %s', async (_label, actorId, targetId) => {
      await service.removeMember(actorId, WS_ID, targetId);
      expect(memberRepository.remove).toHaveBeenCalledWith(WS_ID, targetId, client);
      expect(taskRepository.unassignUserInWorkspace).toHaveBeenCalledWith(WS_ID, targetId, client);
    });

    it.each([
      ['MEMBER removes ADMIN', MEMBER_ID, ADMIN_ID],
      ['ADMIN removes OWNER', ADMIN_ID, OWNER_ID],
      ['OWNER leaves', OWNER_ID, OWNER_ID],
    ])('forbids: %s', async (_label, actorId, targetId) => {
      await expect(service.removeMember(actorId, WS_ID, targetId)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(memberRepository.remove).not.toHaveBeenCalled();
    });

    it('returns 404 when the target is not a member', async () => {
      await expect(service.removeMember(OWNER_ID, WS_ID, OUTSIDER_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
