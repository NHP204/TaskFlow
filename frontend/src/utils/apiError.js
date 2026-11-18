export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request && !error.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
}

/** Maps the API's `errors: [{ field, message }]` to `{ field: message }`. */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors ?? [];
  return Object.fromEntries(errors.map(({ field, message }) => [field, message]));
}

export const getStatus = (error) => error?.response?.status;
