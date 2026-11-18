import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import createErrorHandler from '../../src/middlewares/errorHandler.js';
import ApiError from '../../src/utils/ApiError.js';

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const req = { method: 'GET', originalUrl: '/test' };

describe('errorHandler middleware', () => {
  const logger = { error: jest.fn() };
  const handler = createErrorHandler({ logger });

  beforeEach(() => logger.error.mockClear());

  it('formats an ApiError with its status, message and field errors', () => {
    const res = mockRes();
    const errors = [{ field: 'title', message: 'Title is required' }];

    handler(ApiError.badRequest('Validation failed', errors), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      message: 'Validation failed',
      errors,
    });
  });

  it('maps a PostgreSQL unique violation to 409', () => {
    const res = mockRes();
    handler(Object.assign(new Error('dup'), { code: '23505' }), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 400 for malformed JSON bodies', () => {
    const res = mockRes();
    handler(
      Object.assign(new Error('bad json'), { type: 'entity.parse.failed' }),
      req,
      res,
      jest.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('hides unexpected errors behind a generic 500 and logs them', () => {
    const res = mockRes();
    handler(new Error('secret internal detail'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      message: 'Internal server error',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
