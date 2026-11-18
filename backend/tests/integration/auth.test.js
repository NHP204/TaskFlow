import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import db, { resetDatabase } from '../helpers/db.js';
import { as, tokenFromResponse } from '../helpers/auth.js';

const app = createApp({ db, env, logger: { error: () => {} } });

const alice = { email: 'alice@example.com', password: 'secret123', fullName: 'Alice Nguyen' };

const register = (body = alice) => request(app).post('/api/v1/auth/register').send(body);
const login = (body) => request(app).post('/api/v1/auth/login').send(body);
const me = (token) =>
  token ? as(app, token).get('/api/v1/auth/me') : request(app).get('/api/v1/auth/me');

const authCookie = (res) => [res.headers['set-cookie'] ?? []].flat().join('\n');

beforeEach(() => resetDatabase());
afterAll(() => db.close());

describe('POST /api/v1/auth/register', () => {
  it('creates a user and sets an httpOnly auth cookie (201)', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ user: expect.objectContaining({ id: 1, email: alice.email }) });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookie = authCookie(res);
    expect(cookie).toMatch(/^taskflow_token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api/);
    expect(cookie).toMatch(/Expires=/);
  });

  it('never returns the token in the response body', async () => {
    const res = await register();
    expect(JSON.stringify(res.body)).not.toContain(tokenFromResponse(res));
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

  it('sets the auth cookie for valid credentials (200)', async () => {
    const res = await login({ email: alice.email, password: alice.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(alice.email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(tokenFromResponse(res)).toEqual(expect.any(String));
  });

  it('rejects a wrong password (401) without setting a cookie', async () => {
    const res = await login({ email: alice.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
    expect(res.headers['set-cookie']).toBeUndefined();
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

describe('POST /api/v1/auth/logout', () => {
  it('clears the auth cookie (204)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(204);
    expect(authCookie(res)).toMatch(/^taskflow_token=;.*Expires=Thu, 01 Jan 1970/);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a valid cookie (200)', async () => {
    const res = await me(tokenFromResponse(await register()));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, email: alice.email, fullName: alice.fullName });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects a request without the cookie (401)', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('ignores Bearer tokens: only the cookie authenticates', async () => {
    const token = tokenFromResponse(await register());
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
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
    const token = tokenFromResponse(await register());
    await resetDatabase();

    expect((await me(token)).status).toBe(401);
  });
});

describe('Origin check (CSRF defense)', () => {
  it('rejects state-changing requests from a foreign origin (403)', async () => {
    const token = tokenFromResponse(await register());

    const res = await as(app, token)
      .post('/api/v1/workspaces')
      .set('Origin', 'https://evil.example')
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Origin not allowed');
  });

  it('accepts the configured frontend origin and requests without Origin', async () => {
    const token = tokenFromResponse(await register());

    const fromFrontend = await as(app, token)
      .post('/api/v1/workspaces')
      .set('Origin', env.corsOrigins[0])
      .send({ name: 'Ok' });
    expect(fromFrontend.status).toBe(201);

    const noOrigin = await as(app, token).post('/api/v1/workspaces').send({ name: 'Ok 2' });
    expect(noOrigin.status).toBe(201);
  });

  it('does not block safe methods from other origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
  });
});
