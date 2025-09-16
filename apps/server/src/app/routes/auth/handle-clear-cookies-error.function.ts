import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLogService } from '../../services/audit-log-service.instance';

export async function handleClearCookiesError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
  errorMessage: string
): Promise<void> {
  request.log.error(error, errorMessage);

  auditLogService.logSecurityViolation(request, 'cookie_clearing_error', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });

  await reply.code(500).send({
    error: 'Internal Server Error',
    message: 'Failed to clear cookies',
  });
}
