import { describe, it, expect } from 'vitest';

import { TableState } from '../services/table-state.interface';
import { migrateTableState } from './migrate-table-state.function';

describe('migrateTableState', () => {
  it('should return state unchanged when sortColumns is present', () => {
    const state: TableState = {
      sortColumns: [{ column: 'symbol', direction: 'asc' }],
      sort: { field: 'name', order: 'desc' },
    };
    const result = migrateTableState(state);
    expect(result).toBe(state);
  });

  it('should convert legacy sort to sortColumns when only sort is present', () => {
    const state: TableState = {
      sort: { field: 'buyDate', order: 'desc' },
      filters: { symbol: 'AAPL' },
    };
    const result = migrateTableState(state);
    expect(result.sortColumns).toEqual([
      { column: 'buyDate', direction: 'desc' },
    ]);
    expect(result.sort).toEqual({ field: 'buyDate', order: 'desc' });
    expect(result.filters).toEqual({ symbol: 'AAPL' });
  });

  it('should return state unchanged when neither sort nor sortColumns is present', () => {
    const state: TableState = {
      filters: { active: true },
    };
    const result = migrateTableState(state);
    expect(result).toBe(state);
  });

  it('should return empty state unchanged', () => {
    const state: TableState = {};
    const result = migrateTableState(state);
    expect(result).toBe(state);
  });

  it('should prefer sortColumns over sort when both are present', () => {
    const state: TableState = {
      sortColumns: [
        { column: 'yield', direction: 'desc' },
        { column: 'symbol', direction: 'asc' },
      ],
      sort: { field: 'name', order: 'asc' },
    };
    const result = migrateTableState(state);
    expect(result.sortColumns).toEqual([
      { column: 'yield', direction: 'desc' },
      { column: 'symbol', direction: 'asc' },
    ]);
  });

  it('should handle empty sortColumns array by returning state as-is', () => {
    const state: TableState = {
      sortColumns: [],
    };
    const result = migrateTableState(state);
    expect(result).toBe(state);
  });
});
