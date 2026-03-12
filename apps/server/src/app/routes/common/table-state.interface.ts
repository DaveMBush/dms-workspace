export interface TableState {
  sort?: { field: string; order: 'asc' | 'desc' };
  filters?: Record<string, boolean | number | string | null>;
}
