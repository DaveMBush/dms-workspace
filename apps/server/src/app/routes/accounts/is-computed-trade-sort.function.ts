import { TableState } from '../common/table-state.interface';

const COMPUTED_TRADE_SORT_FIELDS = new Set([
  'unrealizedGainPercent',
  'unrealizedGain',
]);

export function isComputedTradeSort(state: TableState): boolean {
  // Check sortColumns first (format sent by interceptor via migrateTableState)
  if (state.sortColumns !== undefined && state.sortColumns.length > 0) {
    return COMPUTED_TRADE_SORT_FIELDS.has(state.sortColumns[0].column);
  }
  return (
    state.sort !== undefined && COMPUTED_TRADE_SORT_FIELDS.has(state.sort.field)
  );
}
