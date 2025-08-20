import type { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Hoisted mocks
const h = vi.hoisted(() => {
  const client: Record<string, unknown> & {
    screener: { findMany: ReturnType<typeof vi.fn> };
    universe: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    screener: { findMany: vi.fn() },
    universe: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async <T>(fn: (client: unknown) => Promise<T>) => fn(client)),
  };
  return { client };
});

vi.mock('../../settings/common/get-last-price.function', () => ({
  getLastPrice: () => 10,
}));
vi.mock('../../settings/common/get-distributions.function', () => ({
  getDistributions: () => ({
    distribution: 1,
    distributions_per_year: 12,
    ex_date: new Date(0),
  }),
}));
vi.mock('../../../prisma/prisma-client', () => ({
  prisma: h.client,
}));

function createFastify(): FastifyInstance {
  const routes = new Map<string, (req: unknown, reply: { status(code: number): unknown; send(data: unknown): void }) => Promise<void>>();
  return {
    post(path: string, handler: (req: unknown, reply: { status(code: number): unknown; send(data: unknown): void }) => Promise<void>) {
      routes.set(path, handler);
    },
    async invoke(path: string) {
      let statusCode = 200;
      let payload: unknown;
      const reply = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        send(data: unknown) {
          payload = data;
        },
      };
      const handler = routes.get(path)!;
      await handler({}, reply);
      return { statusCode, payload };
    },
  } as unknown as FastifyInstance;
}

describe('sync-from-screener route', () => {
  let registerSyncFromScreener: (f: FastifyInstance) => void;
  beforeEach(() => {
    process.env.USE_SCREENER_FOR_UNIVERSE = 'true';
    // Reset mocks
    h.client.screener.findMany.mockReset();
    h.client.universe.findFirst.mockReset();
    h.client.universe.update.mockReset();
    h.client.universe.create.mockReset();
    h.client.universe.updateMany.mockReset();
    h.client.$transaction.mockReset();
  });

  beforeEach(async () => {
    const mod = await import('./index');
    registerSyncFromScreener = mod.default;
  });

  test('returns 403 when feature disabled', async () => {
    process.env.USE_SCREENER_FOR_UNIVERSE = 'false';
    const f = createFastify();
    registerSyncFromScreener(f);
    const SYNC_PATH = '/sync-from-screener';
    const res = await (f as unknown as { invoke(p: string): Promise<{ statusCode: number; payload: unknown }> }).invoke(SYNC_PATH);
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ inserted: 0, updated: 0, markedExpired: 0, selectedCount: 0 });
  });

  test('idempotent behavior with empty selection', async () => {
    h.client.screener.findMany.mockResolvedValueOnce([]);
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });
    const f = createFastify();
    registerSyncFromScreener(f);
    const SYNC_PATH = '/sync-from-screener';
    const api = f as unknown as { invoke(p: string): Promise<{ statusCode: number; payload: unknown }> };
    const run1 = await api.invoke(SYNC_PATH);
    const run2 = await api.invoke(SYNC_PATH);
    expect(run1.statusCode).toBe(200);
    expect(run2.statusCode).toBe(200);
    expect(run1.payload).toEqual({ inserted: 0, updated: 0, markedExpired: 0, selectedCount: 0 });
    expect(run2.payload).toEqual({ inserted: 0, updated: 0, markedExpired: 0, selectedCount: 0 });
  });
});


