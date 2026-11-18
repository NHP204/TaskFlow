import { describe, it, expect, jest } from '@jest/globals';
import { withTransaction } from '../../src/utils/transaction.js';

function mockPool() {
  const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
  return { client, pool: { connect: jest.fn().mockResolvedValue(client) } };
}

describe('withTransaction', () => {
  it('commits and returns the result when the work succeeds', async () => {
    const { pool, client } = mockPool();

    const result = await withTransaction(pool, async () => 'done');

    expect(result).toBe('done');
    expect(client.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'COMMIT']);
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back, releases the client and rethrows when the work fails', async () => {
    const { pool, client } = mockPool();
    const failure = new Error('boom');

    await expect(
      withTransaction(pool, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(client.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalled();
  });
});
