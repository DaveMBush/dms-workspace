import { TableState } from './table-state.interface';

export function getTableState(
  allState: Record<string, TableState>,
  tableName: string
): TableState {
  return allState[tableName] ?? {};
}
