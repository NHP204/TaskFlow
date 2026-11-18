import { describe, it, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import env from '../../src/config/env.js';
import createApp from '../../src/app.js';
import openapi from '../../src/docs/openapi.js';
import db from '../helpers/db.js';

const app = createApp({ db, env, logger: { error: () => {} } });

afterAll(() => db.close());

const METHODS = ['get', 'post', 'patch', 'delete'];
const operations = Object.entries(openapi.paths).flatMap(([path, item]) =>
  METHODS.filter((method) => item[method]).map((method) => [method.toUpperCase(), path]),
);

describe('API documentation', () => {
  it('serves the spec as JSON and the Swagger UI', async () => {
    const spec = await request(app).get('/api-docs.json');
    expect(spec.status).toBe(200);
    expect(spec.body.info.title).toBe('TaskFlow API');

    const ui = await request(app).get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  it.each(operations)('documents an existing route: %s %s', async (method, path) => {
    const url = `/api/v1${path.replace(/\{[^}]+\}/g, '1')}`;
    const res = await request(app)[method.toLowerCase()](url).send({});

    expect(res.body.message ?? '').not.toMatch(/^Route .* not found$/);
  });
});
