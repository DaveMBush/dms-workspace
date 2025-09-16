import { FastifyReply, FastifyRequest } from 'fastify';

import { validateCognitoConfig } from '../config/cognito-validation.function';
import { isTokenBlacklisted } from '../routes/auth/is-token-blacklisted.function';
import { auditLogService } from '../services/audit-log-service.instance';
import { JWTUser } from '../types/jwt-user.interface';
import { applyRateLimitingWithValidation } from '../utils/apply-rate-limiting.function';
import { extractTokenFromHeader } from '../utils/extract-token-from-header.function';
import { getAuthCookieName } from '../utils/get-auth-cookie-name.function';
import { validateJwtToken } from '../utils/validate-jwt-token.function';
import { AuthenticatedRequest } from './authenticated-request.interface';
import { handleAuthenticationError } from './handle-authentication-error.function';
import { logAuthenticationSuccess } from './log-authentication-success.function';
import { resetAuthFailures } from './reset-auth-failures.function';

export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const clientIP = request.ip || 'unknown';

  try {
    validateCognitoConfig();

    const isRateLimited = await applyRateLimitingWithValidation(request, reply);
    if (isRateLimited) {
      return;
    }

    const token = extractAndValidateToken(request);
    const user = await validateJwtToken(token);

    processSuccessfulAuthentication(request, {
      user,
      clientIP,
      startTime,
      token,
    });
  } catch (error) {
    await handleFailedAuthentication(error, request, reply, {
      clientIP,
      startTime,
    });
  }
}

function extractAndValidateToken(request: FastifyRequest): string {
  let token = extractTokenFromHeader(request.headers.authorization);

  const cookieName = getAuthCookieName();
  if (!token && typeof request.cookies[cookieName] === 'string') {
    token = request.cookies[cookieName];
  }

  if (!token) {
    throw new Error('No authentication token provided');
  }

  if (token.length > 0 && isTokenBlacklisted(token)) {
    auditLogService.logSecurityViolation(request, 'blacklisted_token_used', {
      tokenPrefix: token.substring(0, 16),
    });
    throw new Error('Token has been revoked');
  }

  return token;
}

function processSuccessfulAuthentication(
  request: FastifyRequest,
  authData: {
    user: JWTUser;
    clientIP: string;
    startTime: number;
    token: string;
  }
): void {
  const { user, clientIP, startTime, token } = authData;
  (request as AuthenticatedRequest).user = user;
  resetAuthFailures(clientIP);

  auditLogService.logAuthenticationSuccess(request, user.sub, {
    authMethod: token.startsWith('Bearer ') ? 'header' : 'cookie',
    tokenExpiry:
      typeof user.exp === 'number'
        ? new Date(user.exp * 1000).toISOString()
        : 'unknown',
    duration: Date.now() - startTime,
  });

  logAuthenticationSuccess(request, user, clientIP, startTime);
}

async function handleFailedAuthentication(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  authContext: {
    clientIP: string;
    startTime: number;
  }
): Promise<void> {
  const { clientIP, startTime } = authContext;
  const cookieName = getAuthCookieName();
  auditLogService.logAuthenticationFailure(
    request,
    error instanceof Error ? error.message : 'Unknown error',
    {
      duration: Date.now() - startTime,
      hasAuthHeader: typeof request.headers.authorization === 'string',
      hasSecureCookie: typeof request.cookies[cookieName] === 'string',
      userAgent: request.headers['user-agent'],
    }
  );

  await handleAuthenticationError(error, request, reply, {
    clientIP,
    startTime,
  });
}
