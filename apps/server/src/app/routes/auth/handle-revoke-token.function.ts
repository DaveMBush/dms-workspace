import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLogService } from '../../services/audit-log-service.instance';
import { applySecurityValidation } from '../../utils/apply-security-validation.function';
import { generateSessionId } from '../../utils/generate-session-id.function';
import { tokenBlacklistService } from './token-blacklist.function';

interface RevokeTokenBody {
  token: string;
  reason?: string;
}

const TOKEN_REVOCATION_ERROR_MESSAGE = 'Error revoking token';
const TOKEN_REQUIRED_MESSAGE = 'Token is required';

export async function handleRevokeToken(
  request: FastifyRequest<{ Body: RevokeTokenBody }>,
  reply: FastifyReply
): Promise<void> {
  // Apply security validations
  const isBlocked = await applySecurityValidation(request, reply);
  if (isBlocked) {
    return; // Response already sent
  }

  try {
    const { token, reason = 'manual_revocation' } = request.body;

    if (!token) {
      await reply.code(400).send({
        error: 'Bad Request',
        message: TOKEN_REQUIRED_MESSAGE,
      });
      return;
    }

    // Add token to blacklist
    tokenBlacklistService.addToBlacklist(token, undefined, reason);

    // Log token revocation
    auditLogService.logSecurityEvent({
      eventType: 'SECURITY_VIOLATION',
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.headers['user-agent'] ?? 'unknown',
      timestamp: new Date(),
      details: {
        action: 'token_revoked',
        reason,
      },
      riskLevel: 'MEDIUM',
    });

    await reply.code(200).send({
      message: 'Token revoked successfully',
    });
  } catch (error) {
    request.log.error(error, TOKEN_REVOCATION_ERROR_MESSAGE);

    auditLogService.logSecurityViolation(request, 'token_revocation_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    await reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to revoke token',
    });
  }
}
