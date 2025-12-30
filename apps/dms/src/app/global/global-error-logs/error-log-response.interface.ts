import { ErrorLogEntry } from './error-log-entry.interface';

export interface ErrorLogResponse {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}
