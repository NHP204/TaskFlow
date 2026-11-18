import { describe, expect, it } from 'vitest';
import { getErrorMessage, getFieldErrors } from './apiError.js';

describe('apiError helpers', () => {
  it('prefers the API message', () => {
    const error = { response: { data: { message: 'Email is already registered' } } };
    expect(getErrorMessage(error)).toBe('Email is already registered');
  });

  it('explains network failures', () => {
    expect(getErrorMessage({ request: {} })).toMatch(/Cannot reach the server/);
  });

  it('maps field errors by field name', () => {
    const error = {
      response: {
        data: {
          errors: [
            { field: 'email', message: 'email must be a valid email' },
            { field: 'password', message: 'password is required' },
          ],
        },
      },
    };
    expect(getFieldErrors(error)).toEqual({
      email: 'email must be a valid email',
      password: 'password is required',
    });
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});
