import request from 'supertest';
import { AUTH_COOKIE } from '../../src/utils/authCookie.js';

let counter = 0;

/** Reads the auth token from a response's Set-Cookie header. */
export function tokenFromResponse(res) {
  const header = [res.headers['set-cookie'] ?? []].flat().find((c) => c.startsWith(AUTH_COOKIE));
  return header ? header.split(';')[0].slice(AUTH_COOKIE.length + 1) : null;
}

/** Registers a new user through the API and returns { user, token }. */
export async function createUser(app, overrides = {}) {
  counter += 1;
  const body = {
    email: `user${counter}@example.com`,
    password: 'password123',
    fullName: `User ${counter}`,
    ...overrides,
  };
  const res = await request(app).post('/api/v1/auth/register').send(body);
  if (res.status !== 201) {
    throw new Error(`createUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { user: res.body.data.user, token: tokenFromResponse(res) };
}

/** Request helper that sends the auth cookie. */
export function as(app, token) {
  const withAuth = (req) => req.set('Cookie', `${AUTH_COOKIE}=${token}`);
  return {
    get: (url) => withAuth(request(app).get(url)),
    post: (url) => withAuth(request(app).post(url)),
    patch: (url) => withAuth(request(app).patch(url)),
    delete: (url) => withAuth(request(app).delete(url)),
  };
}
