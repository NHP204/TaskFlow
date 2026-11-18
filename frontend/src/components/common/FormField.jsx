import { useId } from 'react';

/** Label + input (or textarea/select via `as`) + inline validation error. */
export function FormField({ label, error, as: Component = 'input', children, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Component
        id={id}
        className={`input${error ? ' invalid' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {children}
      </Component>
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
