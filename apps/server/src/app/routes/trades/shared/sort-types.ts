export interface SortQuerystring {
  sortBy?: string;
  sortOrder?: string;
}

export interface ValidatedSortParams<T extends string> {
  effectiveSortBy: T;
  effectiveSortOrder: 'asc' | 'desc';
}
