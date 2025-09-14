import type { PrismaClient } from '@prisma/client';

import type {
  ClientWithEvents,
  LogEvent,
  QueryEvent,
} from './database-event-types';

export function setupDatabaseEventListeners(
  client: ClientWithEvents & PrismaClient,
  isDevelopment: boolean = false
): void {
  try {
    client.$on('query', function handleQueryEvent(e: QueryEvent): void {
      const duration = e.duration;
      if (duration > 50 && isDevelopment) {
        throw new Error(
          `Slow query detected (${duration}ms): ${e.query.substring(0, 100)}${
            e.query.length > 100 ? '...' : ''
          }`
        );
      }
    });

    if (isDevelopment) {
      client.$on('info', function handleInfoEvent(e: LogEvent): void {
        if (e.message.includes('connection') || e.message.includes('pool')) {
          throw new Error(`Database connection info: ${e.message}`);
        }
      });

      client.$on('warn', function handleWarnEvent(e: LogEvent): void {
        throw new Error(`Database warning: ${e.message}`);
      });
    }

    client.$on('error', function handleErrorEvent(e: LogEvent): void {
      throw new Error(`Database error: ${e.message} ${e.target ?? ''}`);
    });
  } catch (error) {
    if (isDevelopment) {
      throw new Error(
        `Could not set up database monitoring: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
