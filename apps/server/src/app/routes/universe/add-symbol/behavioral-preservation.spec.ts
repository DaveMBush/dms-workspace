/* eslint-disable sonarjs/no-skipped-tests, vitest/no-disabled-tests -- Red-phase contract tests (Story 14.1): skips are intentional until 14.2 unifies the mapper */
// Story 14.1, Task 3 (AC #3): behavioral-preservation pin for the `add-symbol`
// route (`index.ts`).
//
// These assertions invoke the real route handler with a mocked failing
// dependency and pin the EXACT pre-unification failure response: status code +
// body produced by the hand-rolled local handler `handleAddSymbolError`. After
// Story 14.2 unifies error handling onto one shared per-domain mapper, removing
// `it.skip` from these tests must still pass — same codes and bodies. They are
// marked `it.skip` per AC #4 so the suite stays green until then. No production
// code is touched in this story.

import { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addSymbol } from './add-symbol.function';
import registerAddSymbol from './index';

vi.mock('./add-symbol.function', () => ({ addSymbol: vi.fn() }));

describe('add-symbol route behavioral preservation (Story 14.1, Task 3)', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    const fastifyModule = await import('fastify');
    fastify = fastifyModule.default({ logger: false });
    await fastify.register(registerAddSymbol, { prefix: '/universe' });
    await fastify.ready();
  });

  it.skip('POST /universe/add-symbol on a duplicate symbol returns the pre-unification 409 body', async function assertDuplicateSymbol() {
    vi.mocked(addSymbol).mockRejectedValue(
      new Error('Universe entry already exists'),
    );

    const response = await fastify.inject({
      method: 'POST',
      url: '/universe/add-symbol',
      payload: { symbol: 'ABC', risk_group_id: 'rg-1' },
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Conflict',
      message: 'Universe entry already exists',
    });
  });

  it.skip('POST /universe/add-symbol on an unexpected failure returns the pre-unification 500 body', async function assertUnexpectedFailure() {
    vi.mocked(addSymbol).mockRejectedValue(new Error('boom'));

    const response = await fastify.inject({
      method: 'POST',
      url: '/universe/add-symbol',
      payload: { symbol: 'ABC', risk_group_id: 'rg-1' },
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'Failed to add symbol to universe',
    });
  });
});
