import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLogService } from '../../services/audit-log-service.instance';
import { applySecurityValidation } from '../../utils/apply-security-validation.function';
import { logCookieSuccess } from './log-cookie-success.function';
import { setSecureCookie } from './set-secure-cookie.function';
import { validateCookieRequest } from './validate-cookie-request.function';

interface SetSecureCookieBody {
  token: string;
  expirationDate: string;
}

const SECURE_COOKIE_ERROR_MESSAGE = 'Error setting secure cookie';

export async function handleSetSecureCookie(
  request: FastifyRequest<{ Body: SetSecureCookieBody }>,
  reply: FastifyReply
): Promise<void> {
  // Apply security validations
  const isBlocked = await applySecurityValidation(request, reply);
  if (isBlocked) {
    return; // Response already sent
  }

  try {
    const validation = await validateCookieRequest(request.body, reply);
    if (!validation.isValid) {
      return; // Response already sent
    }

    const { expiresAt, maxAge } = validation;
    const { token } = request.body;

    // Set secure HTTP-only cookie
    setSecureCookie(reply, token, maxAge!);

    // Log successful cookie setting
    logCookieSuccess(request, expiresAt!);

    await reply.code(200).send({
      message: 'Secure cookie set successfully',
      expiresAt: expiresAt!.toISOString(),
    });
  } catch (error) {
    request.log.error(error, SECURE_COOKIE_ERROR_MESSAGE);

    auditLogService.logSecurityViolation(request, 'cookie_setting_error', {
      error: String(error),
    });

    await reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to set secure cookie',
    });
  }
}
