import fastify, { FastifyInstance } from 'fastify';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import registerSettingsRoutes from './index';

// Hoisted mocks — created before module resolution.
const h = vi.hoisted(() => ({
  mockEnsureRiskGroupsExist: vi.fn(),
  mockGetLastPrice: vi.fn(),
  mockGetDistributions: vi.fn(),
  mockCreateUniverseRecord: vi.fn().mockResolvedValue({ id: 'uni-new' }),
  mockPrismaUniverseFindFirst: vi.fn(),
  mockPrismaUniverseUpdate: vi.fn().mockResolvedValue({}),
  mockPrismaUniverseUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock('../settings/common/ensure-risk-groups-exist.function', () => ({
  ensureRiskGroupsExist: h.mockEnsureRiskGroupsExist,
}));

vi.mock('./common/get-last-price.function', () => ({
  getLastPrice: h.mockGetLastPrice,
}));

vi.mock('./common/get-distributions.function', () => ({
  getDistributions: h.mockGetDistributions,
}));

vi.mock('../common/universe-operations.function', () => ({
  createUniverseRecord: h.mockCreateUniverseRecord,
}));

vi.mock('../../prisma/prisma-client', () => ({
  prisma: {
    universe: {
      findFirst: h.mockPrismaUniverseFindFirst,
      update: h.mockPrismaUniverseUpdate,
      updateMany: h.mockPrismaUniverseUpdateMany,
    },
  },
}));

// Risk group ids returned by ensureRiskGroupsExist, in the fixed order the
// settings route relies on: [Equities, Income, Tax Free Income].
const riskGroups = [
  { id: 'rg-1', name: 'Equities' },
  { id: 'rg-2', name: 'Income' },
  { id: 'rg-3', name: 'Tax Free Income' },
];

describe('Settings Route Handler — tax_free_income (Story 16.1, red phase)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(registerSettingsRoutes, { prefix: '/api/settings' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    h.mockEnsureRiskGroupsExist.mockResolvedValue(riskGroups);
    h.mockGetLastPrice.mockResolvedValue(100);
    h.mockGetDistributions.mockResolvedValue({
      result: {
        distribution: 0.25,
        distributions_per_year: 4,
        ex_date: new Date('2099-01-01'),
      },
      history: [],
    });
    h.mockPrismaUniverseFindFirst.mockResolvedValue(undefined);
  });

  // AC1 — POST /api/settings accepts the tax_free_income field and persists its
  // symbols into the Tax Free Income risk group.
  it('persists tax_free_income symbols to the Tax Free Income risk group', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/settings',
      payload: { equities: '', income: '', tax_free_income: 'VWRA' },
    });

    expect(response.statusCode).toBe(200);
    // VWRA must be created under the Tax Free Income group (rg-3), not dropped.
    expect(h.mockCreateUniverseRecord).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'VWRA', riskGroupId: 'rg-3' }),
    );
  });

  // Coverage — an existing universe with no distribution data is left untouched:
  // getExDateToSet returns undefined (no future ex_date) and updateExistingUniverse
  // bails before calling prisma.universe.update.
  it('leaves an existing universe untouched when no distribution is returned', async () => {
    h.mockPrismaUniverseFindFirst.mockResolvedValueOnce({ id: 'uni-x' });
    h.mockGetDistributions.mockResolvedValueOnce({ result: undefined });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings',
      payload: { equities: '', income: '', tax_free_income: 'VWRA' },
    });

    expect(response.statusCode).toBe(200);
    // No distribution -> early return, so the universe row is not rewritten.
    expect(h.mockPrismaUniverseUpdate).not.toHaveBeenCalled();
  });

  // Coverage — an existing universe whose only distribution has a past ex_date keeps
  // its row updated but leaves ex_date unset (shouldSetExDate resolves to false). A
  // null last price also exercises the `lastPrice ?? 0` fallback in the update.
  it('updates an existing universe without setting ex_date when the ex date is in the past', async () => {
    h.mockPrismaUniverseFindFirst.mockResolvedValueOnce({ id: 'uni-past' });
    h.mockGetLastPrice.mockResolvedValueOnce(null);
    h.mockGetDistributions.mockResolvedValueOnce({
      result: {
        distribution: 0.25,
        distributions_per_year: 4,
        ex_date: new Date('2000-01-01'),
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings',
      payload: { equities: '', income: '', tax_free_income: 'VWRA' },
    });

    expect(response.statusCode).toBe(200);
    // Distribution present -> the row is rewritten, re-pointed at rg-3.
    expect(h.mockPrismaUniverseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'uni-past' } }),
    );
  });

  // Coverage — when the expiry sweep fails, the handler catches and returns a 500
  // with the generic error body instead of propagating the rejection.
  it('returns 500 when marking expired symbols fails', async () => {
    h.mockPrismaUniverseUpdateMany.mockRejectedValueOnce(new Error('db down'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings',
      payload: { equities: '', income: '', tax_free_income: '' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal server error' });
  });

  // AC2 — an existing universe currently in the Income group moves to Tax Free
  // Income when submitted via tax_free_income.
  it('moves an existing Income-group universe into Tax Free Income', async () => {
    h.mockPrismaUniverseFindFirst.mockResolvedValueOnce({ id: 'uni-vwra' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings',
      payload: { equities: '', income: '', tax_free_income: 'VWRA' },
    });

    expect(response.statusCode).toBe(200);
    // The existing universe is re-pointed at the Tax Free Income group (rg-3)
    // and un-expired.
    expect(h.mockPrismaUniverseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'uni-vwra' },
        data: expect.objectContaining({
          risk_group_id: 'rg-3',
          expired: false,
        }),
      }),
    );
  });
});
