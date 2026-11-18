export const ACTIVITY = Object.freeze({
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
});

/** Returns { field: { from, to } } for fields in `changes` that differ from `current`. */
export function diffFields(current, changes, fields) {
  const diff = {};
  for (const field of fields) {
    if (changes[field] !== undefined && changes[field] !== current[field]) {
      diff[field] = { from: current[field], to: changes[field] };
    }
  }
  return diff;
}
