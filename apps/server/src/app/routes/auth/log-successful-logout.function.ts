import { FastifyRequest } from 'fastify';

import { auditLogService } from '../../services/audit-log-service.instance';
import { generateSessionId } from '../../utils/generate-session-id.function';

export function logSuccessfulLogout(
  request: FastifyRequest,
  tokenBlacklisted: boolean
): void {
  auditLogService.logSecurityEvent({
    eventType: 'LOGOUT',
    sessionId: generateSessionId(request),
    ipAddress: request.ip ?? 'unknown',
    userAgent: request.headers['user-agent'] ?? 'unknown',
    timestamp: new Date(),
    details: {
      action: 'cookies_cleared',
      tokenBlacklisted,
    },
    riskLevel: 'LOW',
  });
}
