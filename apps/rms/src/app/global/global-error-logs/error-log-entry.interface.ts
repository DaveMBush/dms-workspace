export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'error' | 'info' | 'warning';
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}
