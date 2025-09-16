import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLogService } from '../services/audit-log-service.instance';
import { generateSessionId } from '../utils/generate-session-id.function';

export function securityOnResponseHook(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log security-relevant responses
  const statusCode = reply.statusCode;

  // Log failed authentication attempts
  if (statusCode === 401 || statusCode === 403) {
    auditLogService.logAuthenticationFailure(request, 'unauthorized_access', {
      statusCode,
      url: request.url,
      method: request.method,
    });
  }

  // Log rate limiting events
  if (statusCode === 429) {
    auditLogService.logRateLimitExceeded(request, 'general', {
      url: request.url,
      method: request.method,
    });
  }

  // Log potential security violations
  if (statusCode >= 400 && statusCode < 500) {
    const riskLevel = statusCode === 403 ? 'HIGH' : 'MEDIUM';

    auditLogService.logSecurityEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.headers['user-agent'] ?? 'unknown',
      timestamp: new Date(),
      details: {
        statusCode,
        url: request.url,
        method: request.method,
        referer: request.headers.referer,
      },
      riskLevel,
    });
  }
}
