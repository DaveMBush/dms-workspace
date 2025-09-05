import { FastifyReply, FastifyRequest } from 'fastify';

import { validateCognitoConfig } from '../config/cognito-validation.function';
import { extractTokenFromHeader } from '../utils/extract-token-from-header.function';
import { validateJwtToken } from '../utils/validate-jwt-token.function';
import { AuthenticatedRequest } from './authenticated-request.interface';
import { handleAuthenticationError } from './handle-authentication-error.function';
import { handleRateLimiting } from './handle-rate-limiting.function';
import { logAuthenticationSuccess } from './log-authentication-success.function';
import { resetAuthFailures } from './reset-auth-failures.function';

export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const clientIP = request.ip;

  try {
    validateCognitoConfig();

    // Check rate limiting
    const isRateLimited = await handleRateLimiting(request, reply, clientIP);
    if (isRateLimited) {
      return;
    }

    // Extract and validate JWT token
    const token = extractTokenFromHeader(request.headers.authorization);
    const user = await validateJwtToken(token);

    // Attach user to request
    (request as AuthenticatedRequest).user = user;

    // Reset failure count and log success
    resetAuthFailures(clientIP);
    logAuthenticationSuccess(request, user, clientIP, startTime);
  } catch (error) {
    await handleAuthenticationError(error, request, reply, {
      clientIP,
      startTime,
    });
  }
}
