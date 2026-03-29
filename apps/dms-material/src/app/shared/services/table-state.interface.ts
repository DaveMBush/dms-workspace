import { FilterConfig } from './filter-config.interface';
import { SortColumn } from './sort-column.interface';
import { SortConfig } from './sort-config.interface';

export interface TableState {
  sort?: SortConfig;
  sortColumns?: SortColumn[];
  filters?: FilterConfig;
}
