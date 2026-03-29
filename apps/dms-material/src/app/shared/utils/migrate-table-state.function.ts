import { TableState } from '../services/table-state.interface';

export function migrateTableState(state: TableState): TableState {
  if (state.sortColumns !== undefined) {
    return state;
  }
  if (state.sort !== undefined) {
    return {
      ...state,
      sortColumns: [{ column: state.sort.field, direction: state.sort.order }],
    };
  }
  return state;
}
