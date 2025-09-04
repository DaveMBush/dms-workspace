/* eslint-disable @typescript-eslint/member-ordering, eslint-comments/no-restricted-disable, @smarttools/no-anonymous-functions, @smarttools/one-exported-item-per-file, @typescript-eslint/explicit-member-accessibility -- Infrastructure logging class with specific ordering and access patterns */
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import type { LogContext, StructuredLogEntry } from './structured-logger-types';

interface RequestLoggerReturn {
  logger: StructuredLogger;
  setContext<T>(callback: () => T): T;
  setContextAsync<T>(callback: () => Promise<T>): Promise<T>;
}

class StructuredLogger {
  private contextStorage = new AsyncLocalStorage<LogContext>();
  private logsDir: string;
  private logFilePath!: string;
  private environment: string;
  private service: string;

  constructor(service: string = 'rms-backend') {
    this.service = service;
    this.environment = process.env.NODE_ENV ?? 'development';
    this.logsDir = join(process.cwd(), 'logs');
    this.setupLogging();
  }

  private setupLogging(): void {
    this.ensureLogsDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const serviceId = randomUUID().substring(0, 8);
    this.logFilePath = join(
      this.logsDir,
      `${this.service}-${timestamp}-${serviceId}.log`
    );
  }

  public setContext<T>(context: LogContext, callback: () => T): T {
    return this.contextStorage.run(context, callback);
  }

  public async setContextAsync<T>(
    context: LogContext,
    callback: () => Promise<T>
  ): Promise<T> {
    return this.contextStorage.run(context, callback);
  }

  public getContext(): LogContext | undefined {
    return this.contextStorage.getStore();
  }

  public info(message: string, data?: Record<string, unknown>): void {
    this.writeStructuredLog('info', message, data);
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    this.writeStructuredLog('warn', message, data);
  }

  public error(
    message: string,
    error?: Error,
    data?: Record<string, unknown>
  ): void {
    const errorData = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code:
              (error as { code?: number | string }).code ??
              (error as { statusCode?: number | string }).statusCode,
          },
        }
      : {};

    this.writeStructuredLog('error', message, { ...data, ...errorData });
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    if (
      this.environment === 'development' ||
      process.env.LOG_LEVEL === 'debug'
    ) {
      this.writeStructuredLog('debug', message, data);
    }
  }

  public performance(
    message: string,
    startTime: [number, number],
    data?: Record<string, unknown>
  ): void {
    const endTime = process.hrtime(startTime);
    const duration = endTime[0] * 1000 + endTime[1] / 1e6; // Convert to milliseconds
    const memoryUsage = process.memoryUsage();

    this.writeStructuredLog('info', message, {
      ...data,
      performance: {
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
        memoryUsage,
      },
    });
  }

  public security(event: string, data?: Record<string, unknown>): void {
    this.writeStructuredLog('warn', `SECURITY_EVENT: ${event}`, {
      ...data,
      securityEvent: true,
      eventType: event,
    });
  }

  public business(
    metric: string,
    value: number,
    data?: Record<string, unknown>
  ): void {
    this.writeStructuredLog('info', `BUSINESS_METRIC: ${metric}`, {
      ...data,
      businessMetric: true,
      metricName: metric,
      metricValue: value,
    });
  }

  private writeStructuredLog(
    level: 'debug' | 'error' | 'info' | 'warn',
    message: string,
    data?: Record<string, unknown>
  ): void {
    const context = this.getContext();
    const timestamp = new Date().toISOString();

    const entry: StructuredLogEntry = {
      timestamp,
      correlationId: context?.requestId ?? randomUUID(),
      level,
      message,
      service: this.service,
      environment: this.environment,
      data,
      ...(context && { context }),
    };

    // Write to file for local development
    if (this.environment === 'development') {
      this.writeToFile(entry);
    }

    // Always write to console in structured format for CloudWatch
    this.writeToConsole(entry);
  }

  private writeToFile(entry: StructuredLogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    writeFileSync(this.logFilePath, logLine, { flag: 'a' });
  }

  private writeToConsole(entry: StructuredLogEntry): void {
    // CloudWatch expects structured JSON logs
    // eslint-disable-next-line no-console -- Console logging required for CloudWatch integration
    console.log(JSON.stringify(entry));
  }

  private ensureLogsDirectory(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // Factory method for creating request-specific loggers
  public static createRequestLogger(
    requestId: string,
    userId?: string
  ): RequestLoggerReturn {
    const logger = new StructuredLogger();
    const context: LogContext = {
      requestId,
      userId,
    };

    return {
      logger,
      setContext<T>(callback: () => T): T {
        return logger.setContext(context, callback);
      },
      async setContextAsync<T>(callback: () => Promise<T>): Promise<T> {
        return logger.setContextAsync(context, callback);
      },
    };
  }
}

// Export singleton instance
export const logger = new StructuredLogger();

// Export the class for testing and custom instances
export { StructuredLogger };
