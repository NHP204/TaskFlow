import ApiError from '../utils/ApiError.js';

const SOURCES = ['params', 'query', 'body'];

/**
 * Validates request parts against Joi schemas: validate({ body, query, params }).
 * Validated, type-coerced values are exposed on `req.validated[source]`
 * because Express 5 makes `req.query` read-only; `req.body` is also replaced.
 */
export default function validate(schemas) {
  return (req, res, next) => {
    const errors = [];
    req.validated = req.validated || {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const { value, error } = schema.validate(req[source] ?? {}, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            field: detail.path.join('.') || source,
            message: detail.message.replace(/"/g, ''),
          });
        }
      } else {
        req.validated[source] = value;
        if (source === 'body') req.body = value;
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed', errors));
    }
    return next();
  };
}
