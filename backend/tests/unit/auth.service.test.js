import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import createAuthService from '../../src/services/auth.service.js';
import ApiError from '../../src/utils/ApiError.js';

const storedUser = {
  id: 1,
  email: 'alice@example.com',
  fullName: 'Alice',
  passwordHash: 'hashed:secret123',
};

describe('authService', () => {
  let userRepository;
  let passwordHasher;
  let tokenService;
  let authService;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn(async (password) => `hashed:${password}`),
      compare: jest.fn(async (password, hash) => hash === `hashed:${password}`),
    };
    tokenService = { sign: jest.fn(() => 'signed-token') };
    authService = createAuthService({ userRepository, passwordHasher, tokenService });
  });

  describe('register', () => {
    it('hashes the password, normalizes input and returns a token', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockImplementation(async (data) => ({
        id: 1,
        email: data.email,
        fullName: data.fullName,
      }));

      const result = await authService.register({
        email: '  Alice@Example.COM ',
        password: 'secret123',
        fullName: ' Alice ',
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'alice@example.com',
        passwordHash: 'hashed:secret123',
        fullName: 'Alice',
      });
      expect(tokenService.sign).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        user: { id: 1, email: 'alice@example.com', fullName: 'Alice' },
        accessToken: 'signed-token',
      });
    });

    it('rejects an email that already exists with 409', async () => {
      userRepository.findByEmail.mockResolvedValue(storedUser);

      const promise = authService.register({
        email: 'alice@example.com',
        password: 'secret123',
        fullName: 'Alice',
      });

      await expect(promise).rejects.toMatchObject({ statusCode: 409 });
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns the user without passwordHash and a token', async () => {
      userRepository.findByEmail.mockResolvedValue(storedUser);

      const result = await authService.login({
        email: 'ALICE@example.com',
        password: 'secret123',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result).toEqual({
        user: { id: 1, email: 'alice@example.com', fullName: 'Alice' },
        accessToken: 'signed-token',
      });
    });

    it('rejects a wrong password with 401', async () => {
      userRepository.findByEmail.mockResolvedValue(storedUser);

      await expect(
        authService.login({ email: 'alice@example.com', password: 'wrong-pass' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
      expect(tokenService.sign).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same 401 error', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'secret123' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user', async () => {
      userRepository.findById.mockResolvedValue({ id: 1, email: 'alice@example.com' });
      await expect(authService.getCurrentUser(1)).resolves.toEqual({
        id: 1,
        email: 'alice@example.com',
      });
    });

    it('throws 401 when the user no longer exists', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(authService.getCurrentUser(99)).rejects.toBeInstanceOf(ApiError);
    });
  });
});
