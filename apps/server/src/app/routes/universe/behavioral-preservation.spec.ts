/* eslint-disable sonarjs/no-skipped-tests, vitest/no-disabled-tests -- Red-phase contract tests (Story 14.1): skips are intentional until 14.2 unifies the mapper */
// Story 14.1, Task 3 (AC #3): behavioral-preservation pin for the `universe`
// route (`index.ts`).
//
// These assertions invoke the real route handler with a mocked failing
// dependency and pin the EXACT pre-unification failure response: status code
// + body produced by the hand-rolled local handler in `handleDeleteUniverseRoute`.
// After Story 14.2 unifies error handling onto one shared per-domain mapper,
// removing `it.skip` from these tests must still pass — same codes and bodies.
// They are marked `it.skip` per AC #4 so the suite stays green until then.
// No production code is touched in this story.

import { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../prisma/prisma-client';
import registerUniverseRoutes from './index';

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    universe: { findUnique: vi.fn(), delete: vi.fn() },
    trades: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock('../../volatility/recalculate-universe-volatility.function', () => ({
  recalculateUniverseVolatility: vi.fn(),
}));
vi.mock('../common/dividend-history.service', () => ({
  fetchDividendHistory: vi.fn(),
}));
// `./add-symbol` (route) is registered by the universe plugin; mock the heavy
// function module it depends on so registration stays side-effect free.
vi.mock('./add-symbol/add-symbol.function', () => ({ addSymbol: vi.fn() }));

describe('universe route behavioral preservation (Story 14.1, Task 3)', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    const fastifyModule = await import('fastify');
    fastify = fastifyModule.default({ logger: false });
    await fastify.register(registerUniverseRoutes, { prefix: '/universe' });
    await fastify.ready();
  });

  it.skip('DELETE /universe/:id on a missing universe returns the pre-unification 404 body', async function assertDeleteMissingUniverse() {
    vi.mocked(prisma.universe.findUnique).mockResolvedValue(null);

    const response = await fastify.inject({
      method: 'DELETE',
      url: '/universe/missing-id',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload)).toEqual({
      success: false,
      error: 'Universe entry not found',
    });
  });
});
