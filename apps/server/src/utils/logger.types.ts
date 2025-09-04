export interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'debug' | 'error' | 'info' | 'warn';
  message: string;
  data?: Record<string, unknown>;
}
