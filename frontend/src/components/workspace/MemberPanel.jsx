import { useState } from 'react';
import { Avatar } from '../common/Avatar.jsx';
import { ErrorMessage } from '../common/Feedback.jsx';
import { RoleBadge } from '../common/RoleBadge.jsx';
import { workspaceService } from '../../services/workspace.service.js';
import { getFieldErrors } from '../../utils/apiError.js';
import {
  assignableRoles,
  canChangeRole,
  canRemoveMember,
  isManager,
} from '../../utils/permissions.js';

function AddMemberForm({ workspaceId, actorRole, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    setFieldError(null);
    try {
      await workspaceService.addMember(workspaceId, { email: email.trim(), role });
      setEmail('');
      setRole('MEMBER');
      onAdded();
    } catch (err) {
      setFieldError(getFieldErrors(err).email ?? null);
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && !fieldError && <ErrorMessage error={error} />}
      <div className="row">
        <input
          className={`input${fieldError ? ' invalid' : ''}`}
          type="email"
          placeholder="teammate@example.com"
          aria-label="Member email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="input"
          style={{ width: 'auto' }}
          aria-label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {assignableRoles(actorRole).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={submitting || !email.trim()}>
          Add
        </button>
      </div>
      {fieldError && <span className="field-error">{fieldError}</span>}
    </form>
  );
}

export function MemberPanel({ workspace, currentUserId, onChanged, onLeft }) {
  const [error, setError] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);

  const actor = workspace.members.find((m) => m.userId === currentUserId) ?? {
    userId: currentUserId,
    role: workspace.role,
  };

  const run = async (userId, action, after) => {
    setBusyUserId(userId);
    setError(null);
    try {
      await action();
      after();
    } catch (err) {
      setError(err);
    } finally {
      setBusyUserId(null);
    }
  };

  const changeRole = (member, role) =>
    run(
      member.userId,
      () => workspaceService.updateMemberRole(workspace.id, member.userId, role),
      onChanged,
    );

  const remove = (member) => {
    const isSelf = member.userId === currentUserId;
    const question = isSelf
      ? `Leave "${workspace.name}"? You will lose access to its projects.`
      : `Remove ${member.fullName} from this workspace? Their tasks will be unassigned.`;
    if (!window.confirm(question)) return;
    run(
      member.userId,
      () => workspaceService.removeMember(workspace.id, member.userId),
      isSelf ? onLeft : onChanged,
    );
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Members</h2>
        <span className="muted small">{workspace.members.length}</span>
      </div>

      {error && <ErrorMessage error={error} />}

      <ul className="member-list">
        {workspace.members.map((member) => (
          <li key={member.userId} className="member">
            <Avatar name={member.fullName} />
            <div className="member-info">
              <div>
                {member.fullName}
                {member.userId === currentUserId && <span className="muted"> (you)</span>}
              </div>
              <div className="muted small">{member.email}</div>
            </div>

            {canChangeRole(actor, member) ? (
              <select
                className="input"
                style={{ width: 'auto' }}
                aria-label={`Role of ${member.fullName}`}
                value={member.role}
                disabled={busyUserId === member.userId}
                onChange={(e) => changeRole(member, e.target.value)}
              >
                <option>MEMBER</option>
                <option>ADMIN</option>
              </select>
            ) : (
              <RoleBadge role={member.role} />
            )}

            {canRemoveMember(actor, member) && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={busyUserId === member.userId}
                onClick={() => remove(member)}
              >
                {member.userId === currentUserId ? 'Leave' : 'Remove'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {isManager(actor.role) && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Add member</h3>
          <AddMemberForm workspaceId={workspace.id} actorRole={actor.role} onAdded={onChanged} />
        </div>
      )}
    </div>
  );
}
