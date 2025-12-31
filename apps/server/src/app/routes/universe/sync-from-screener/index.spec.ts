import type { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Hoisted mocks
const h = vi.hoisted(() => {
  const client: Record<string, unknown> & {
    screener: { findMany: ReturnType<typeof vi.fn> };
    universe: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    screener: { findMany: vi.fn() },
    universe: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
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

// Constants for test values
const TEST_CORRELATION_ID = 'test-correlation-id';
const TEST_LOG_PATH = '/test/log/path.log';

// Mock the logger to avoid file system operations during tests
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  getCorrelationId: vi.fn(() => TEST_CORRELATION_ID),
  getLogFilePath: vi.fn(() => TEST_LOG_PATH),
};

vi.mock('../../../../utils/logger', () => ({
  SyncLogger: vi.fn().mockImplementation(function (this: any) {
    Object.assign(this, mockLogger);
  }),
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: h.client,
}));

function createFastify(): FastifyInstance {
  const routes = new Map<
    string,
    (
      req: unknown,
      reply: { status(code: number): unknown; send(data: unknown): void }
    ) => Promise<void>
  >();
  return {
    post(
      path: string,
      handler: (
        req: unknown,
        reply: { status(code: number): unknown; send(data: unknown): void }
      ) => Promise<void>
    ) {
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

  const SYNC_PATH = '/sync-from-screener';
  const RISK_GROUP_1 = 'risk1';
  const RISK_GROUP_2 = 'risk2';
  const EXISTING_ID = 'existing-id';

  const expectedEmptyResponse = {
    inserted: 0,
    updated: 0,
    markedExpired: 0,
    preservedEtfCount: 0,
    selectedCount: 0,
    correlationId: TEST_CORRELATION_ID,
    logFilePath: TEST_LOG_PATH,
  };

  function createApiInstance(f: FastifyInstance): {
    invoke(p: string): Promise<{ statusCode: number; payload: unknown }>;
  } {
    return f as unknown as {
      invoke(p: string): Promise<{ statusCode: number; payload: unknown }>;
    };
  }

  beforeEach(() => {
    process.env.USE_SCREENER_FOR_UNIVERSE = 'true';
    // Reset mocks
    h.client.screener.findMany.mockReset();
    h.client.universe.findFirst.mockReset();
    h.client.universe.findMany.mockReset();
    h.client.universe.update.mockReset();
    h.client.universe.create.mockReset();
    h.client.universe.updateMany.mockReset();
    h.client.$transaction.mockReset();

    // Reset logger mocks
    vi.clearAllMocks();

    // Set up default transaction mock that handles the new structure
    h.client.$transaction.mockImplementation(
      async <T>(fn: (client: unknown) => Promise<T>) => {
        return fn(h.client);
      }
    );
  });

  beforeEach(async () => {
    const mod = await import('./index');
    registerSyncFromScreener = mod.default;
  });

  test('successful sync with empty selection', async () => {
    h.client.screener.findMany.mockResolvedValueOnce([]);
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });
    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const run1 = await api.invoke(SYNC_PATH);
    expect(run1.statusCode).toBe(200);
    expect(run1.payload).toEqual(expectedEmptyResponse);
  });

  test('successful sync with new symbol insertion', async () => {
    const mockSymbols = [
      { symbol: 'TEST1', risk_group_id: RISK_GROUP_1 },
      { symbol: 'TEST2', risk_group_id: RISK_GROUP_2 },
    ];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null); // No existing records
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 2,
      updated: 0,
      markedExpired: 0,
      preservedEtfCount: 0,
      selectedCount: 2,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(h.client.universe.create).toHaveBeenCalledTimes(2);
  });

  test('successful sync with existing symbol update', async () => {
    const mockSymbols = [{ symbol: 'EXISTING', risk_group_id: RISK_GROUP_1 }];
    const existingRecord = {
      id: EXISTING_ID,
      symbol: 'EXISTING',
      last_price: 5.0,
      distribution: 0.5,
      distributions_per_year: 4,
      ex_date: new Date('2024-01-01'),
      expired: false,
    };

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValueOnce(existingRecord);
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.update.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 0,
      updated: 1,
      markedExpired: 0,
      preservedEtfCount: 0,
      selectedCount: 1,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(h.client.universe.update).toHaveBeenCalledWith({
      where: { id: EXISTING_ID },
      data: {
        risk_group_id: RISK_GROUP_1,
        last_price: 10,
        distribution: 1,
        distributions_per_year: 12,
        ex_date: new Date('2024-01-01'),
        expired: false,
      },
    });
  });

  test('marks symbols as expired when not in screener', async () => {
    const mockSymbols = [{ symbol: 'ACTIVE', risk_group_id: RISK_GROUP_1 }];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null);
    h.client.universe.findMany.mockResolvedValueOnce([]); // For ETF count
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 3 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 1,
      updated: 0,
      markedExpired: 3,
      preservedEtfCount: 0,
      selectedCount: 1,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(h.client.universe.updateMany).toHaveBeenCalledWith({
      where: {
        symbol: { notIn: ['ACTIVE'] },
        expired: false,
        is_closed_end_fund: true,
      },
      data: { expired: true },
    });
  });

  test('handles symbol processing failures gracefully', async () => {
    const mockSymbols = [
      { symbol: 'GOOD', risk_group_id: RISK_GROUP_1 },
      { symbol: 'BAD', risk_group_id: RISK_GROUP_2 },
    ];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst
      .mockResolvedValueOnce(null) // GOOD symbol - no existing record
      .mockRejectedValueOnce(new Error('Database error')); // BAD symbol - error
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 1,
      updated: 0,
      markedExpired: 0,
      preservedEtfCount: 0,
      selectedCount: 2,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to process symbol', {
      symbol: 'BAD',
      error: 'Database error',
    });
  });

  test('logs appropriate messages during sync operation', async () => {
    const mockSymbols = [{ symbol: 'TEST', risk_group_id: RISK_GROUP_1 }];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null);
    h.client.universe.findMany.mockResolvedValueOnce([]); // For ETF count
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 1 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    await api.invoke(SYNC_PATH);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Sync from screener operation started',
      {
        timestamp: expect.any(String) as string,
      }
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Selected eligible screener records',
      {
        selectedCount: 1,
        symbols: ['TEST'],
      }
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Marked CEF universe records as expired',
      {
        expiredCount: 1,
        totalSymbols: 1,
      }
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Counted preserved ETF symbols during sync',
      {
        preservedEtfCount: 0,
        etfSymbols: [],
      }
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'ETF preservation sync transaction completed',
      {
        cefSymbolsExpired: 1,
        etfSymbolsPreserved: 0,
        correlationId: 'test-correlation-id',
      }
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Sync from screener operation completed successfully',
      {
        summary: {
          inserted: 1,
          updated: 0,
          markedExpired: 1,
          preservedEtfCount: 0,
          selectedCount: 1,
        },
        duration: expect.any(Number) as number,
        etfPreservationDetails: {
          preservedEtfCount: 0,
          cefSymbolsProcessed: 1,
          cefSymbolsExpired: 1,
        },
        correlationId: 'test-correlation-id',
      }
    );
  });

  test('handles transaction failure in sync operation', async () => {
    h.client.screener.findMany.mockRejectedValueOnce(
      new Error('Transaction failed')
    );

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual(expectedEmptyResponse);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Sync from screener operation failed',
      {
        error: 'Transaction failed',
        duration: expect.any(Number) as number,
        correlationId: 'test-correlation-id',
      }
    );
  });

  test('selects eligible screener records with correct criteria', async () => {
    const mockSymbols = [{ symbol: 'ELIGIBLE', risk_group_id: RISK_GROUP_1 }];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null);
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    await api.invoke(SYNC_PATH);

    expect(h.client.screener.findMany).toHaveBeenCalledWith({
      where: {
        has_volitility: true,
        objectives_understood: true,
        graph_higher_before_2008: true,
      },
      select: { symbol: true, risk_group_id: true },
    });
  });

  test('idempotency: repeated sync operations produce consistent results', async () => {
    const mockSymbols = [{ symbol: 'REPEAT', risk_group_id: RISK_GROUP_1 }];
    const existingRecord = {
      id: 'repeat-id',
      symbol: 'REPEAT',
      last_price: 8.0,
      distribution: 0.75,
      distributions_per_year: 4,
      ex_date: new Date('2024-06-01'),
      expired: false,
    };

    h.client.screener.findMany.mockResolvedValue(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(existingRecord);
    h.client.universe.update.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValue({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);

    // First sync
    const result1 = await api.invoke(SYNC_PATH);
    // Second sync
    const result2 = await api.invoke(SYNC_PATH);

    expect(result1.payload).toEqual(result2.payload);
    expect(h.client.universe.update).toHaveBeenCalledTimes(2);
    expect(h.client.universe.update).toHaveBeenCalledWith({
      where: { id: 'repeat-id' },
      data: {
        risk_group_id: RISK_GROUP_1,
        last_price: 10,
        distribution: 1,
        distributions_per_year: 12,
        ex_date: new Date('2024-06-01'),
        expired: false,
      },
    });
  });

  test('handles mixed insert and update operations', async () => {
    const mockSymbols = [
      { symbol: 'NEW', risk_group_id: RISK_GROUP_1 },
      { symbol: 'EXISTING', risk_group_id: RISK_GROUP_2 },
    ];
    const existingRecord = {
      id: EXISTING_ID,
      symbol: 'EXISTING',
      last_price: 15.0,
      distribution: 1.2,
      distributions_per_year: 6,
      ex_date: new Date('2024-03-01'),
      expired: false,
    };

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst
      .mockResolvedValueOnce(null) // NEW symbol - no existing record
      .mockResolvedValueOnce(existingRecord); // EXISTING symbol
    h.client.universe.findMany.mockResolvedValueOnce([]); // For ETF count
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.update.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 2 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 1,
      updated: 1,
      markedExpired: 2,
      preservedEtfCount: 0,
      selectedCount: 2,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(h.client.universe.create).toHaveBeenCalledTimes(1);
    expect(h.client.universe.update).toHaveBeenCalledTimes(1);
  });

  test('handles expire operation failure', async () => {
    const mockSymbols = [{ symbol: 'TEST', risk_group_id: RISK_GROUP_1 }];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null);
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockRejectedValueOnce(
      new Error('Database connection lost')
    );

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual(expectedEmptyResponse);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Sync from screener operation failed',
      {
        error: 'Database connection lost',
        duration: expect.any(Number) as number,
        correlationId: 'test-correlation-id',
      }
    );
  });

  test('processes only valid symbols and skips null/undefined', async () => {
    const mockSymbols = [
      { symbol: 'VALID1', risk_group_id: RISK_GROUP_1 },
      { symbol: 'VALID2', risk_group_id: RISK_GROUP_2 },
    ];

    h.client.screener.findMany.mockResolvedValueOnce(mockSymbols);
    h.client.universe.findFirst.mockResolvedValue(null);
    h.client.universe.findMany.mockResolvedValueOnce([]);
    h.client.universe.create.mockResolvedValue({});
    h.client.universe.updateMany.mockResolvedValueOnce({ count: 0 });

    const f = createFastify();
    registerSyncFromScreener(f);
    const api = createApiInstance(f);
    const result = await api.invoke(SYNC_PATH);

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({
      inserted: 2,
      updated: 0,
      markedExpired: 0,
      preservedEtfCount: 0,
      selectedCount: 2,
      correlationId: 'test-correlation-id',
      logFilePath: '/test/log/path.log',
    });

    expect(h.client.universe.create).toHaveBeenCalledTimes(2);
  });
});
