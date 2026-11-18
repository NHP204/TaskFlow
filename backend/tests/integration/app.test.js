import { describe, it, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import env from '../../src/config/env.js';
import db from '../../src/config/database.js';
import createApp from '../../src/app.js';

const app = createApp({ db, env, logger: { error: () => {} } });

afterAll(() => db.close());

describe('GET /api/v1/health', () => {
  it('returns 200 when the database is reachable', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok', database: 'up' },
      message: 'Service is healthy',
    });
  });

  it('returns 503 when the database is down', async () => {
    const brokenDb = { query: () => Promise.reject(new Error('connection refused')) };
    const brokenApp = createApp({ db: brokenDb, env });

    const res = await request(brokenApp).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});

describe('Common error responses', () => {
  it('returns 404 in the standard envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Malformed JSON in request body');
  });
});

describe('Database schema', () => {
  it('has all tables from the initial migration', async () => {
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'pgmigrations'
       ORDER BY table_name`,
    );

    expect(rows.map((r) => r.table_name)).toEqual([
      'activity_logs',
      'projects',
      'task_comments',
      'tasks',
      'users',
      'workspace_members',
      'workspaces',
    ]);
  });

  async function inRolledBackTransaction(work) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await work(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  it('enforces CHECK, UNIQUE and FK constraints', async () => {
    await inRolledBackTransaction(async (client) => {
      const {
        rows: [user],
      } = await client.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ('a@example.com', 'hash', 'A') RETURNING id`,
      );
      const {
        rows: [ws],
      } = await client.query(
        `INSERT INTO workspaces (name, owner_id) VALUES ('WS', $1) RETURNING id`,
        [user.id],
      );
      const {
        rows: [project],
      } = await client.query(
        `INSERT INTO projects (workspace_id, name) VALUES ($1, 'P') RETURNING id`,
        [ws.id],
      );

      await client.query('SAVEPOINT s');
      await expect(
        client.query(`INSERT INTO tasks (project_id, title, status) VALUES ($1, 'T', 'INVALID')`, [
          project.id,
        ]),
      ).rejects.toMatchObject({ code: '23514', constraint: 'tasks_status_check' });
      await client.query('ROLLBACK TO SAVEPOINT s');

      await expect(
        client.query(
          `INSERT INTO users (email, password_hash, full_name) VALUES ('a@example.com', 'h', 'B')`,
        ),
      ).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT s');

      await expect(
        client.query(`INSERT INTO workspace_members (workspace_id, user_id) VALUES ($1, 999999)`, [
          ws.id,
        ]),
      ).rejects.toMatchObject({ code: '23503' });
    });
  });
});
