export interface LogFilters {
  level: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  search: string;
  selectedFile?: string | null;
}
