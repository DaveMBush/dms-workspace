import { SortColumn } from './sort-column.interface';

export interface TableState {
  sort?: { field: string; order: 'asc' | 'desc' };
  sortColumns?: SortColumn[];
  filters?: Record<string, boolean | number | string | null>;
}
