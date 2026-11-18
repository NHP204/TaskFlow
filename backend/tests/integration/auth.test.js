import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';

const app = createApp({ db, env, logger: { error: () => {} } });

const alice = { email: 'alice@example.com', password: 'secret123', fullName: 'Alice Nguyen' };

const register = (body = alice) => request(app).post('/api/v1/auth/register').send(body);
const login = (body) => request(app).post('/api/v1/auth/login').send(body);
const me = (token) => {
  const req = request(app).get('/api/v1/auth/me');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

beforeEach(() => resetDatabase());
afterAll(() => db.close());

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns a token (201)', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      id: 1,
      email: alice.email,
      fullName: alice.fullName,
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await register();

    const { rows } = await db.query('SELECT password_hash FROM users WHERE email = $1', [
      alice.email,
    ]);
    expect(rows[0].password_hash).not.toBe(alice.password);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email regardless of case (409)', async () => {
    await register();
    const res = await register({ ...alice, email: 'ALICE@Example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, message: 'Email is already registered' });
  });

  it('returns field errors for invalid input (400)', async () => {
    const res = await register({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.map((e) => e.field).sort()).toEqual(['email', 'fullName', 'password']);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => register());

  it('returns a token for valid credentials (200)', async () => {
    const res = await login({ email: alice.email, password: alice.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(alice.email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('rejects a wrong password (401)', async () => {
    const res = await login({ email: alice.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same message (401)', async () => {
    const res = await login({ email: 'bob@example.com', password: alice.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('requires email and password (400)', async () => {
    const res = await login({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a valid token (200)', async () => {
    const { body } = await register();
    const res = await me(body.data.accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, email: alice.email, fullName: alice.fullName });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects a request without a token (401)', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a malformed Authorization header (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid or expired token (401)', async () => {
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, env.jwt.secret, {
      subject: '1',
    });

    expect((await me('garbage')).status).toBe(401);
    expect((await me(expired)).status).toBe(401);
  });

  it('rejects a token for a user that no longer exists (401)', async () => {
    const { body } = await register();
    await resetDatabase();

    const res = await me(body.data.accessToken);
    expect(res.status).toBe(401);
  });
});
