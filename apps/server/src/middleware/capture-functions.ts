/* eslint-disable @smarttools/one-exported-item-per-file, @smarttools/no-anonymous-functions, @typescript-eslint/strict-boolean-expressions -- Infrastructure monitoring code with specific requirements */

import { logger } from '../utils/structured-logger';
import { XRaySegment } from './mock-xray-segment';
import { XRaySubsegment } from './mock-xray-subsegment';

// Global segment storage for request correlation
const segmentStorage = new Map<string, XRaySegment>();

export { segmentStorage };

interface QueryTracer {
  close(error?: Error, rowCount?: number): void;
}

interface HTTPTracer {
  close(error?: Error, statusCode?: number): void;
}

// Database query tracing helper
export function captureDBQuery(query: string, params?: unknown[]): QueryTracer {
  const context = logger.getContext();
  const requestId = context?.requestId ?? 'unknown';
  const segment = segmentStorage.get(requestId);

  if (segment) {
    return createTracedDBQuery(segment, query, params);
  }

  return createFallbackDBQuery(query);
}

function createTracedDBQuery(
  segment: XRaySegment,
  query: string,
  params?: unknown[]
): QueryTracer {
  const subsegment = segment.addNewSubsegment('database_query');
  const queryType = query.trim().split(' ')[0].toUpperCase();

  setupDBSubsegment(subsegment, queryType, query, params);
  const startTime = process.hrtime();

  return {
    close: (error?: Error, rowCount?: number): void => {
      if (error) {
        subsegment.addError(error);
        logger.error('Database query failed', error, {
          queryType,
          query: query.substring(0, 200),
        });
      } else {
        logger.performance('Database query completed', startTime, {
          queryType,
          rowCount,
        });

        if (rowCount !== undefined) {
          subsegment.addAnnotation('row_count', rowCount);
        }
      }
      subsegment.close();
    },
  };
}

function createFallbackDBQuery(query: string): QueryTracer {
  const startTime = process.hrtime();
  return {
    close: (error?: Error, rowCount?: number): void => {
      if (error) {
        logger.error('Database query failed (no tracing)', error);
      } else {
        logger.performance('Database query completed (no tracing)', startTime, {
          queryType: query.trim().split(' ')[0].toUpperCase(),
          rowCount,
        });
      }
    },
  };
}

function setupDBSubsegment(
  subsegment: XRaySubsegment,
  queryType: string,
  query: string,
  params?: unknown[]
): void {
  subsegment.addAnnotation('query_type', queryType);
  subsegment.addAnnotation('has_params', Boolean(params));
  subsegment.addMetadata('database', {
    sql: query.length > 1000 ? query.substring(0, 1000) + '...' : query,
    paramCount: params?.length ?? 0,
  });

  logger.debug('Database query started', {
    queryType,
    hasParams: Boolean(params),
    queryLength: query.length,
  });
}

// HTTP client tracing helper
export function captureHTTPCall(url: string, method = 'GET'): HTTPTracer {
  const context = logger.getContext();
  const requestId = context?.requestId ?? 'unknown';
  const segment = segmentStorage.get(requestId);

  if (segment) {
    const subsegment = segment.addNewSubsegment('http_call');

    subsegment.addAnnotation('url', url);
    subsegment.addAnnotation('method', method);
    subsegment.addMetadata('http', { url, method });

    logger.debug('HTTP call started', { url, method });

    const startTime = process.hrtime();

    return {
      close: (error?: Error, statusCode?: number): void => {
        if (error) {
          subsegment.addError(error);
          logger.error('HTTP call failed', error, { url, method });
        } else {
          logger.performance('HTTP call completed', startTime, {
            url,
            method,
            statusCode,
          });

          if (statusCode) {
            subsegment.addAnnotation('status_code', statusCode);
          }
        }
        subsegment.close();
      },
    };
  }

  // Fallback for when no segment is available
  const startTime = process.hrtime();
  return {
    close: (error?: Error, statusCode?: number): void => {
      if (error) {
        logger.error('HTTP call failed (no tracing)', error, { url, method });
      } else {
        logger.performance('HTTP call completed (no tracing)', startTime, {
          url,
          method,
          statusCode,
        });
      }
    },
  };
}
