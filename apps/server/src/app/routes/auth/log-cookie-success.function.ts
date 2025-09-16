import { FastifyRequest } from 'fastify';

import { auditLogService } from '../../services/audit-log-service.instance';
import { generateSessionId } from '../../utils/generate-session-id.function';

export function logCookieSuccess(
  request: FastifyRequest,
  expiresAt: Date
): void {
  auditLogService.logSecurityEvent({
    eventType: 'AUTH_SUCCESS',
    sessionId: generateSessionId(request),
    ipAddress: request.ip ?? 'unknown',
    userAgent: request.headers['user-agent'] ?? 'unknown',
    timestamp: new Date(),
    details: {
      action: 'secure_cookie_set',
      expiresAt: expiresAt.toISOString(),
    },
    riskLevel: 'LOW',
  });
}
