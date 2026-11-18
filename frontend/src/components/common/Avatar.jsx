const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export function Avatar({ name, small = false }) {
  return (
    <span className={`avatar${small ? ' avatar-sm' : ''}`} title={name} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}
