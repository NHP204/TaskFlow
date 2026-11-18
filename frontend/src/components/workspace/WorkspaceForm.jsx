import { useState } from 'react';
import { FormField } from '../common/FormField.jsx';
import { ErrorMessage } from '../common/Feedback.jsx';
import { getFieldErrors } from '../../utils/apiError.js';

/** Create or edit form for a workspace or project (both have name + description). */
export function NameDescriptionForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Name is required' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: form.name.trim(), description: form.description.trim() });
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
        label="Name"
        value={form.name}
        maxLength={100}
        autoFocus
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        error={fieldErrors.name}
      />
      <FormField
        as="textarea"
        label="Description"
        value={form.description}
        maxLength={1000}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        error={fieldErrors.description}
      />
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
