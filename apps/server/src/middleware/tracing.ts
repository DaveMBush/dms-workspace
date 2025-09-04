/* eslint-disable @typescript-eslint/naming-convention, @smarttools/no-anonymous-functions, @typescript-eslint/require-await, @typescript-eslint/strict-boolean-expressions, @smarttools/one-exported-item-per-file -- Infrastructure monitoring code with specific requirements */
// X-Ray Distributed Tracing Middleware for Fastify
// Provides request tracing and performance monitoring

import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

import { logger } from '../utils/structured-logger';
import { LogContext } from '../utils/structured-logger-types';
import {
  captureDBQuery,
  captureHTTPCall,
  segmentStorage,
} from './capture-functions';
import { MockXRaySegment, XRaySegment } from './mock-xray-segment';
import { XRaySubsegment } from './mock-xray-subsegment';
import {
  extractSessionIdFromRequest,
  extractUserIdFromRequest,
} from './tracing-helpers';

const USER_AGENT_HEADER = 'user-agent';

// Main tracing middleware - simplified without hooks
export async function tracingMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const requestId = request.id ?? randomUUID();
  const traceId = generateTraceId(request);
  const userId = extractUserIdFromRequest(request);
  const sessionId = extractSessionIdFromRequest(request);

  // Create new X-Ray segment
  const segment = new MockXRaySegment('rms-backend-request');
  segmentStorage.set(requestId, segment);

  // Add request metadata to segment
  addRequestMetadata(segment, request, requestId, traceId);
  addAuthMetadata(segment, request, userId);

  const userAgentValue = request.headers[USER_AGENT_HEADER];
  const logContext: LogContext = {
    requestId,
    userId,
    sessionId,
    traceId,
    userAgent: userAgentValue!,
    ipAddress: request.ip ?? request.socket.remoteAddress,
  };

  // Set context for structured logging
  return logger.setContextAsync(logContext, logRequestStart(request));
}

function generateTraceId(request: FastifyRequest): string {
  return (
    (request.headers['x-amzn-trace-id'] as string) ??
    `Root=1-${Math.floor(Date.now() / 1000).toString(16)}-${randomUUID()
      .replace(/-/g, '')
      .substring(0, 24)}`
  );
}

function logRequestStart(request: FastifyRequest): () => Promise<void> {
  return async (): Promise<void> => {
    logger.info(`Request started: ${request.method} ${request.url}`, {
      method: request.method,
      url: request.url,
      userAgent: request.headers[USER_AGENT_HEADER],
      ipAddress: request.ip,
    });
  };
}

function addRequestMetadata(
  segment: MockXRaySegment,
  request: FastifyRequest,
  requestId: string,
  traceId: string
): void {
  segment.addAnnotation('method', request.method);
  segment.addAnnotation('url', request.url);
  segment.addAnnotation('user_agent', request.headers[USER_AGENT_HEADER] ?? '');
  segment.addAnnotation('request_id', requestId);
  segment.addAnnotation('trace_id', traceId);
}

function addAuthMetadata(
  segment: MockXRaySegment,
  request: FastifyRequest,
  userId?: string
): void {
  const hasAuth = Boolean(request.headers.authorization);
  if (hasAuth) {
    segment.addAnnotation('authenticated', true);
    if (userId && userId.length > 0) {
      segment.addAnnotation('user_id', userId);
    }
  }
}

// Re-export capture functions and types for backward compatibility
export { captureDBQuery, captureHTTPCall, XRaySegment, XRaySubsegment };
