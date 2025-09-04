/* eslint-disable @smarttools/one-exported-item-per-file -- Type definitions require multiple exports */
import type { LogEntry } from './logger.types';

export interface LogContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface StructuredLogEntry extends LogEntry {
  service: string;
  environment: string;
  context?: LogContext;
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: number | string;
  };
}
