export function RoleBadge({ role }) {
  return <span className={`badge badge-${role.toLowerCase()}`}>{role}</span>;
}
