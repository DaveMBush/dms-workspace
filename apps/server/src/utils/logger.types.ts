export interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'error' | 'info' | 'warn';
  message: string;
  data?: Record<string, unknown>;
}
