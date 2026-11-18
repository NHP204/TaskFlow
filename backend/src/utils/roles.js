export const ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
});

export const ALL_ROLES = Object.values(ROLES);
export const MANAGER_ROLES = [ROLES.OWNER, ROLES.ADMIN];

// Roles that can be granted through the members API (ownership is not transferable here).
export const ASSIGNABLE_ROLES = [ROLES.ADMIN, ROLES.MEMBER];
