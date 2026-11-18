// Mirrors the backend rules so the UI only offers allowed actions.
// The API still enforces every rule; these only hide controls.

export const isManager = (role) => role === 'OWNER' || role === 'ADMIN';

export function canRemoveMember(actor, target) {
  if (target.role === 'OWNER') return false;
  if (actor.userId === target.userId) return true;
  if (actor.role === 'OWNER') return true;
  return actor.role === 'ADMIN' && target.role === 'MEMBER';
}

export const canChangeRole = (actor, target) => actor.role === 'OWNER' && target.role !== 'OWNER';

export const assignableRoles = (actorRole) =>
  actorRole === 'OWNER' ? ['MEMBER', 'ADMIN'] : ['MEMBER'];

export function canEditTask(role, userId, task) {
  return isManager(role) || task.createdBy === userId || task.assigneeId === userId;
}

export const canDeleteTask = (role, userId, task) => isManager(role) || task.createdBy === userId;

export const canDeleteComment = (role, userId, comment) =>
  isManager(role) || comment.author.id === userId;
