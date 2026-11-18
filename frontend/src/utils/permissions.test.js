import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canChangeRole,
  canDeleteTask,
  canEditTask,
  canRemoveMember,
} from './permissions.js';

const owner = { userId: 1, role: 'OWNER' };
const admin = { userId: 2, role: 'ADMIN' };
const member = { userId: 3, role: 'MEMBER' };
const otherMember = { userId: 4, role: 'MEMBER' };

describe('member permissions', () => {
  it('matches the backend removal rules', () => {
    expect(canRemoveMember(owner, admin)).toBe(true);
    expect(canRemoveMember(admin, member)).toBe(true);
    expect(canRemoveMember(member, member)).toBe(true);
    expect(canRemoveMember(admin, owner)).toBe(false);
    expect(canRemoveMember(owner, owner)).toBe(false);
    expect(canRemoveMember(member, otherMember)).toBe(false);
    expect(canRemoveMember(admin, { userId: 5, role: 'ADMIN' })).toBe(false);
  });

  it('only lets the owner change non-owner roles', () => {
    expect(canChangeRole(owner, member)).toBe(true);
    expect(canChangeRole(owner, owner)).toBe(false);
    expect(canChangeRole(admin, member)).toBe(false);
  });

  it('only lets the owner grant ADMIN', () => {
    expect(assignableRoles('OWNER')).toContain('ADMIN');
    expect(assignableRoles('ADMIN')).toEqual(['MEMBER']);
  });
});

describe('task permissions', () => {
  const task = { createdBy: 3, assigneeId: 4 };

  it('allows managers, the creator and the assignee to edit', () => {
    expect(canEditTask('ADMIN', 9, task)).toBe(true);
    expect(canEditTask('MEMBER', 3, task)).toBe(true);
    expect(canEditTask('MEMBER', 4, task)).toBe(true);
    expect(canEditTask('MEMBER', 9, task)).toBe(false);
  });

  it('allows managers and the creator to delete', () => {
    expect(canDeleteTask('OWNER', 9, task)).toBe(true);
    expect(canDeleteTask('MEMBER', 3, task)).toBe(true);
    expect(canDeleteTask('MEMBER', 4, task)).toBe(false);
  });
});
