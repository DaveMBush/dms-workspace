/* eslint-disable @smarttools/one-exported-item-per-file -- Log type definitions are logically grouped together */
export interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'debug' | 'error' | 'info' | 'warn';
  message: string;
  service: string;
  environment: string;
  data?: Record<string, unknown>;
  context?: {
    requestId: string;
    userId?: string;
  };
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'error' | 'info' | 'warning';
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}

export interface ErrorLogResponse {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface LogFilters {
  level?: string;
  from?: string;
  to?: string;
  search?: string;
  file?: string;
}

export interface LogFileInfo {
  filename: string;
  displayName: string;
  size: number;
  lastModified: string;
}