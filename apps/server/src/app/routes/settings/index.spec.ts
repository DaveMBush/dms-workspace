/* eslint-disable vitest/no-disabled-tests -- Red-phase tests (Story 16.1): skips are intentional until Story 16.2 aligns the settings schema/handler field names */
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

// @atdd — ATDD red-phase scaffolding for Story 16.1 (tax_free_income). The two
// acceptance-criteria tests below are intentionally skipped until Story 16.2
// implements the handler fix and flips them on (it.skip -> it). This marker
// exempts the file from scripts/check-no-skipped-tests.sh while deferred.

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
  // symbols into the Tax Free Income risk group. Skipped in red phase; Story 16.2
  // unskips this once the handler reads `tax_free_income` (not `taxFreeIncome`).
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

  // AC2 — an existing universe currently in the Income group moves to Tax Free
  // Income when submitted via tax_free_income. Skipped in red phase; Story 16.2
  // unskips this once the handler processes the tax_free_income group value.
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
