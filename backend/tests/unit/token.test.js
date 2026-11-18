import { describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import createTokenService from '../../src/utils/token.js';

const secret = 'unit-test-secret';
const tokenService = createTokenService({ secret, expiresIn: '1h' });

describe('tokenService', () => {
  it('signs a token that verifies back to the user id', () => {
    const token = tokenService.sign(42);
    expect(tokenService.verify(token)).toBe(42);
  });

  it('rejects a token signed with another secret', () => {
    const token = jwt.sign({}, 'other-secret', { subject: '42' });
    expect(() => tokenService.verify(token)).toThrow('Invalid or expired token');
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, secret, { subject: '42' });
    expect(() => tokenService.verify(token)).toThrow('Invalid or expired token');
  });

  it('rejects an unsigned token (alg: none)', () => {
    const token = jwt.sign({}, null, { algorithm: 'none', subject: '42' });
    expect(() => tokenService.verify(token)).toThrow('Invalid or expired token');
  });

  it('rejects a token without a valid subject', () => {
    const token = jwt.sign({}, secret, { subject: 'abc' });
    expect(() => tokenService.verify(token)).toThrow('Invalid or expired token');
  });
});
