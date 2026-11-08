/* eslint-disable sonarjs/no-skipped-tests, vitest/no-disabled-tests -- Red-phase contract tests (Story 14.1): skips are intentional until 14.2 unifies the mapper */
// Story 14.1, Task 3 (AC #3): behavioral-preservation pin for the `health`
// route (`index.ts`).
//
// These assertions invoke the real health plugin with a mocked failing database
// dependency and pin the EXACT pre-unification failure response: status code +
// body produced by the inline hand-built 503 objects. After Story 14.2 unifies
// error handling onto one shared per-domain mapper, removing `it.skip` from
// these tests must still pass — same codes and bodies. They are marked
// `it.skip` per AC #4 so the suite stays green until then. No production code
// is touched in this story.

import { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import healthRoutes from './index';

vi.mock('../../prisma/prisma-client', () => ({
  checkDatabaseHealth: vi.fn(),
}));

// Import AFTER the mock so the route sees the mocked dependency.
const { checkDatabaseHealth } = await import('../../prisma/prisma-client');

describe('health route behavioral preservation (Story 14.1, Task 3)', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    const fastifyModule = await import('fastify');
    fastify = fastifyModule.default({ logger: false });
    await fastify.register(healthRoutes, { prefix: '/health' });
    await fastify.ready();
  });

  it.skip('GET /health/detailed on an unhealthy database returns the pre-unification 503 body', async function assertDetailedUnhealthy() {
    vi.mocked(checkDatabaseHealth).mockResolvedValue({
      healthy: false,
      error: 'db down',
    });

    const response = await fastify.inject({
      method: 'GET',
      url: '/health/detailed',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body.status).toBe('unhealthy');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.responseTime).toBe('number');
    expect(body.database).toEqual({ status: 'unhealthy', error: 'db down' });
    // `version` mirrors process.env.npm_package_version || 'unknown'.
    expect(body.version).toBe(process.env.npm_package_version ?? 'unknown');
  });

  it.skip('GET /health/database on an unhealthy database returns the pre-unification 503 body', async function assertDatabaseUnhealthy() {
    vi.mocked(checkDatabaseHealth).mockResolvedValue({
      healthy: false,
      error: 'db down',
    });

    const response = await fastify.inject({
      method: 'GET',
      url: '/health/database',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body.status).toBe('unhealthy');
    expect(body.error).toBe('db down');
    expect(typeof body.timestamp).toBe('string');
  });

  it.skip('GET /health/ready on an unhealthy database returns the pre-unification 503 body', async function assertReadyUnhealthy() {
    vi.mocked(checkDatabaseHealth).mockResolvedValue({
      healthy: false,
      error: 'db down',
    });

    const response = await fastify.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body.ready).toBe(false);
    expect(body.reason).toBe('Database not available');
    expect(typeof body.timestamp).toBe('string');
  });
});
