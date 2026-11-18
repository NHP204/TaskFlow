/**
 * Helpers that enforce the response envelope:
 *   { success, data, message } and, for errors, { ..., errors }.
 */
function sendSuccess(res, { statusCode = 200, data = null, message = 'Success', meta } = {}) {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendCreated(res, { data, message = 'Created successfully' } = {}) {
  return sendSuccess(res, { statusCode: 201, data, message });
}

function sendNoContent(res) {
  return res.status(204).end();
}

function sendError(
  res,
  { statusCode = 500, message = 'Internal server error', errors = null } = {},
) {
  const body = { success: false, data: null, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendCreated, sendNoContent, sendError };
