import { describe, it, expect, jest } from '@jest/globals';
import Joi from 'joi';
import validate from '../../src/middlewares/validate.js';
import ApiError from '../../src/utils/ApiError.js';

describe('validate middleware', () => {
  const middleware = validate({
    body: Joi.object({ title: Joi.string().trim().required() }),
    query: Joi.object({ page: Joi.number().integer().min(1).default(1) }),
  });

  it('passes valid input and exposes coerced values', () => {
    const req = { body: { title: '  Task  ', extra: 'x' }, query: { page: '2' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ title: 'Task' }); // trimmed, unknown key stripped
    expect(req.validated.query).toEqual({ page: 2 }); // string coerced to number
  });

  it('collects every field error into a 400 ApiError', () => {
    const req = { body: {}, query: { page: '0' } };
    const next = jest.fn();

    middleware(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.errors.map((e) => e.field).sort()).toEqual(['page', 'title']);
  });
});
