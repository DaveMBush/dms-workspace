import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';

/**
 * Performance timing interceptor that measures request execution times
 * for authentication-related operations
 */
export const performanceInterceptor: HttpInterceptorFn =
  function performanceInterceptorImpl(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
  ): Observable<HttpEvent<unknown>> {
    return measureRequestPerformance(req, next);
  };

/**
 * Measure request performance timing
 */
function measureRequestPerformance(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const performanceService = inject(PerformanceLoggingService);
  const requestId = extractRequestId(req);
  const startTime = performance.now();
  const operation = determineOperation(req);

  return next(req).pipe(
    tap(function logPerformanceMetrics(event) {
      if (event instanceof HttpResponse) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceService.logPerformanceMetric({
          requestId,
          operation,
          startTime,
          endTime,
          duration,
          success: event.ok,
          statusCode: event.status,
          url: req.url,
          method: req.method,
          cacheHit: extractCacheHit(event),
        });
      }
    }),
    catchError(function logErrorMetrics(error: unknown) {
      const httpError = error as HttpErrorResponse;
      const endTime = performance.now();
      const duration = endTime - startTime;

      performanceService.logPerformanceMetric({
        requestId,
        operation,
        startTime,
        endTime,
        duration,
        success: false,
        statusCode: httpError.status,
        url: req.url,
        method: req.method,
        cacheHit: undefined,
      });

      return throwError(function createError() {
        return httpError;
      });
    })
  );
}

/**
 * Extract request ID from headers
 */
function extractRequestId(req: HttpRequest<unknown>): string {
  const requestId = req.headers.get('X-Request-ID');
  return requestId !== null && requestId.length > 0
    ? requestId
    : generateFallbackRequestId();
}

/**
 * Generate fallback request ID if none exists
 */
function generateFallbackRequestId(): string {
  // Use crypto.randomUUID if available, otherwise fallback to timestamp
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `perf-${crypto.randomUUID()}`;
  }
  return `perf-${Date.now()}-${Date.now().toString(36)}`;
}

/**
 * Determine the type of operation based on request URL and method
 */
function determineOperation(req: HttpRequest<unknown>): string {
  const url = req.url.toLowerCase();
  const method = req.method.toUpperCase();

  if (url.includes('/auth/')) {
    if (method === 'POST' && url.includes('/login')) {
      return 'auth-login';
    }
    if (method === 'POST' && url.includes('/refresh')) {
      return 'auth-refresh';
    }
    if (method === 'POST' && url.includes('/logout')) {
      return 'auth-logout';
    }
    return 'auth-general';
  }

  if (url.includes('/api/')) {
    return `api-${method.toLowerCase()}`;
  }

  return `${method.toLowerCase()}-request`;
}

/**
 * Extract cache hit information from response headers
 */
function extractCacheHit(response: HttpResponse<unknown>): boolean | undefined {
  const cacheStatus = response.headers.get('X-Cache-Status');
  if (cacheStatus === 'HIT') {
    return true;
  }
  if (cacheStatus === 'MISS') {
    return false;
  }
  return undefined;
}
