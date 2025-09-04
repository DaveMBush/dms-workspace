/* eslint-disable @smarttools/one-exported-item-per-file, @typescript-eslint/strict-boolean-expressions -- Infrastructure monitoring code with specific requirements */

import { FastifyRequest } from 'fastify';

// Helper functions
export function extractUserIdFromRequest(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return (
        'user-' +
        Buffer.from(authHeader.split(' ')[1]).toString('base64').substring(0, 8)
      );
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function extractSessionIdFromRequest(
  request: FastifyRequest
): string | undefined {
  const sessionHeader = request.headers['x-session-id'] as string;
  if (sessionHeader !== undefined && sessionHeader.length > 0) {
    return sessionHeader;
  }

  const cookies = request.headers.cookie;
  if (cookies) {
    const sessionMatch = /sessionId=([^;]+)/.exec(cookies);
    if (sessionMatch) {
      return sessionMatch[1];
    }
  }

  return undefined;
}