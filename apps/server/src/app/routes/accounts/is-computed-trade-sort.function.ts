import { TableState } from '../common/table-state.interface';

const COMPUTED_TRADE_SORT_FIELDS = new Set([
  'unrealizedGainPercent',
  'unrealizedGain',
]);

export function isComputedTradeSort(state: TableState): boolean {
  return (
    state.sort !== undefined && COMPUTED_TRADE_SORT_FIELDS.has(state.sort.field)
  );
}
