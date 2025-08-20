import { randomUUID } from 'crypto';
import { existsSync,mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import type { LogEntry } from './logger.types';

class SyncLogger {
  private correlationId: string;
  private logFilePath: string;
  private logsDir: string;

  constructor() {
    this.correlationId = randomUUID();
    this.logsDir = join(process.cwd(), 'logs');
    this.ensureLogsDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFilePath = join(this.logsDir, `sync-${timestamp}-${this.correlationId}.log`);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      level: 'info',
      message,
      data,
    });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      level: 'warn',
      message,
      data,
    });
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      level: 'error',
      message,
      data,
    });
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  private ensureLogsDirectory(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private writeLog(entry: LogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    writeFileSync(this.logFilePath, logLine, { flag: 'a' });
  }
}

export { SyncLogger };
