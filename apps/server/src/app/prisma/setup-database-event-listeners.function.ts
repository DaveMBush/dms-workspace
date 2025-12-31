import type { PrismaClient } from '@prisma/client';

import { logger } from '../../utils/structured-logger';
import type {
  ClientWithEvents,
  LogEvent,
  QueryEvent,
} from './database-event-types';

export function setupDatabaseEventListeners(
  client: PrismaClient,
  isDevelopment: boolean = false
): void {
  try {
    // Cast to ClientWithEvents to enable event listeners
    // Prisma 7 with adapters has type issues with $on
    const eventClient = client as unknown as ClientWithEvents;

    eventClient.$on('query', function handleQueryEvent(e: QueryEvent): void {
      const duration = e.duration;
      if (duration > 50 && isDevelopment) {
        logger.warn(
          `Slow query detected (${duration}ms): ${e.query.substring(0, 100)}${
            e.query.length > 100 ? '...' : ''
          }`
        );
      }
    });

    if (isDevelopment) {
      eventClient.$on('info', function handleInfoEvent(e: LogEvent): void {
        if (e.message.includes('connection') || e.message.includes('pool')) {
          logger.info(`Database connection info: ${e.message}`);
        }
      });

      eventClient.$on('warn', function handleWarnEvent(e: LogEvent): void {
        throw new Error(`Database warning: ${e.message}`);
      });
    }

    eventClient.$on('error', function handleErrorEvent(e: LogEvent): void {
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
