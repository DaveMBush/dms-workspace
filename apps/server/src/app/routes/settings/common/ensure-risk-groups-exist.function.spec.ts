import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ensureRiskGroupsExist } from './ensure-risk-groups-exist.function';

// Hoisted mocks
const { mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('../../../prisma/prisma-client', () => ({
  prisma: {
    risk_group: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

describe('ensureRiskGroupsExist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('creates all risk groups when none exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCreate
      .mockResolvedValueOnce({ id: 1, name: 'Equities' })
      .mockResolvedValueOnce({ id: 2, name: 'Income' })
      .mockResolvedValueOnce({ id: 3, name: 'Tax Free Income' });

    const result = await ensureRiskGroupsExist();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Equities' } });
    expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Income' } });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Tax Free Income' },
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 1, name: 'Equities' });
    expect(result[1]).toEqual({ id: 2, name: 'Income' });
    expect(result[2]).toEqual({ id: 3, name: 'Tax Free Income' });
  });

  test('returns existing risk groups when all exist', async () => {
    const existingGroups = [
      { id: 1, name: 'Equities' },
      { id: 2, name: 'Income' },
      { id: 3, name: 'Tax Free Income' },
    ];
    mockFindMany.mockResolvedValueOnce(existingGroups);

    const result = await ensureRiskGroupsExist();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 1, name: 'Equities' });
    expect(result[1]).toEqual({ id: 2, name: 'Income' });
    expect(result[2]).toEqual({ id: 3, name: 'Tax Free Income' });
  });

  test('returns existing risk groups in different order', async () => {
    const existingGroups = [
      { id: 3, name: 'Tax Free Income' },
      { id: 1, name: 'Equities' },
      { id: 2, name: 'Income' },
    ];
    mockFindMany.mockResolvedValueOnce(existingGroups);

    const result = await ensureRiskGroupsExist();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 1, name: 'Equities' });
    expect(result[1]).toEqual({ id: 2, name: 'Income' });
    expect(result[2]).toEqual({ id: 3, name: 'Tax Free Income' });
  });

  test('creates missing risk groups when some exist', async () => {
    const existingGroups = [{ id: 1, name: 'Equities' }];
    mockFindMany.mockResolvedValueOnce(existingGroups);
    mockCreate
      .mockResolvedValueOnce({ id: 2, name: 'Income' })
      .mockResolvedValueOnce({ id: 3, name: 'Tax Free Income' });

    const result = await ensureRiskGroupsExist();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Income' } });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Tax Free Income' },
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 1, name: 'Equities' });
    expect(result[1]).toEqual({ id: 2, name: 'Income' });
    expect(result[2]).toEqual({ id: 3, name: 'Tax Free Income' });
  });

  test('handles database error on findMany', async () => {
    const dbError = new Error('Database connection failed');
    mockFindMany.mockRejectedValueOnce(dbError);

    await expect(ensureRiskGroupsExist()).rejects.toThrow(
      'Database connection failed'
    );
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('handles database error on create', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const dbError = new Error('Create operation failed');
    mockCreate.mockRejectedValueOnce(dbError);

    await expect(ensureRiskGroupsExist()).rejects.toThrow(
      'Create operation failed'
    );
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('ensures correct order when existing groups have extra properties', async () => {
    const existingGroups = [
      {
        id: 1,
        name: 'Equities',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 2,
        name: 'Income',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 3,
        name: 'Tax Free Income',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];
    mockFindMany.mockResolvedValueOnce(existingGroups);

    const result = await ensureRiskGroupsExist();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Equities');
    expect(result[1].name).toBe('Income');
    expect(result[2].name).toBe('Tax Free Income');
  });
});
