import { useState } from 'react';
import { FormField } from '../common/FormField.jsx';
import { ErrorMessage } from '../common/Feedback.jsx';
import { getFieldErrors } from '../../utils/apiError.js';
import { STATUSES, todayString } from '../../utils/format.js';

export function TaskForm({ task, members, defaultStatus = 'TODO', onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaultStatus,
    assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
    dueDate: task?.dueDate ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const unchangedDueDate = task && form.dueDate === task.dueDate;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (form.dueDate && !unchangedDueDate && form.dueDate < todayString()) {
      errors.dueDate = 'Due date cannot be in the past';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <ErrorMessage error={error} />}
      <FormField
        label="Title"
        value={form.title}
        maxLength={200}
        autoFocus
        onChange={set('title')}
        error={fieldErrors.title}
      />
      <FormField
        as="textarea"
        label="Description"
        value={form.description}
        maxLength={5000}
        onChange={set('description')}
        error={fieldErrors.description}
      />
      <div className="form-row">
        <FormField
          as="select"
          label="Status"
          value={form.status}
          onChange={set('status')}
          error={fieldErrors.status}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label="Assignee"
          value={form.assigneeId}
          onChange={set('assigneeId')}
          error={fieldErrors.assigneeId}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={String(m.userId)}>
              {m.fullName}
            </option>
          ))}
        </FormField>
      </div>
      <FormField
        label="Due date"
        type="date"
        value={form.dueDate}
        min={unchangedDueDate ? undefined : todayString()}
        onChange={set('dueDate')}
        error={fieldErrors.dueDate}
      />
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
