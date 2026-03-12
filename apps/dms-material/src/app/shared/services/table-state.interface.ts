import { FilterConfig } from './filter-config.interface';
import { SortConfig } from './sort-config.interface';

export interface TableState {
  sort?: SortConfig;
  filters?: FilterConfig;
}
