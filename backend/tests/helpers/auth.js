import request from 'supertest';

let counter = 0;

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
  return { user: res.body.data.user, token: res.body.data.accessToken };
}

/** Returns a supertest agent-like helper that sends the Bearer token. */
export function as(app, token) {
  const withAuth = (req) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (url) => withAuth(request(app).get(url)),
    post: (url) => withAuth(request(app).post(url)),
    patch: (url) => withAuth(request(app).patch(url)),
    delete: (url) => withAuth(request(app).delete(url)),
  };
}
