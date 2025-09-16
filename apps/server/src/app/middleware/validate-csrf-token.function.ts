import { FastifyReply, FastifyRequest } from 'fastify';

import { generateSessionId } from '../utils/generate-session-id.function';
import { csrfTokenStore } from './csrf-token-store.constant';
import { TOKEN_EXPIRY } from './token-expiry.constant';

export async function validateCSRFToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  if (shouldSkipCSRFValidation(request)) {
    return true;
  }

  const { tokenFromHeader, tokenFromCookie } = extractTokens(request);

  if (
    tokenFromHeader === null ||
    tokenFromHeader === undefined ||
    tokenFromHeader === ''
  ) {
    return sendCSRFError(
      request,
      reply,
      'CSRF_TOKEN_MISSING',
      'CSRF token required'
    );
  }

  if (
    tokenFromCookie === null ||
    tokenFromCookie === undefined ||
    tokenFromCookie === '' ||
    tokenFromHeader !== tokenFromCookie
  ) {
    return sendCSRFTokenMismatchError(
      request,
      reply,
      tokenFromHeader,
      tokenFromCookie
    );
  }

  return validateStoredToken(request, reply, tokenFromHeader);
}

function shouldSkipCSRFValidation(request: FastifyRequest): boolean {
  // Skip CSRF validation for GET requests (read-only operations)
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true;
  }

  // Skip CSRF validation for health checks and auth endpoints in development
  return (
    process.env.NODE_ENV === 'development' &&
    (request.url.includes('/health') || request.url.includes('/ready'))
  );
}

function extractTokens(request: FastifyRequest): {
  tokenFromHeader: string | undefined;
  tokenFromCookie: string | undefined;
} {
  return {
    tokenFromHeader: request.headers['x-csrf-token'] as string | undefined,
    tokenFromCookie: request.cookies['csrf-token'],
  };
}

async function sendCSRFError(
  request: FastifyRequest,
  reply: FastifyReply,
  code: string,
  message: string
): Promise<boolean> {
  request.log.warn(
    {
      url: request.url,
      method: request.method,
      ip: request.ip,
    },
    'CSRF token missing from request header'
  );

  await reply.code(403).send({
    error: 'Forbidden',
    message,
    code,
  });
  return false;
}

async function sendCSRFTokenMismatchError(
  request: FastifyRequest,
  reply: FastifyReply,
  tokenFromHeader: string | undefined,
  tokenFromCookie: string | undefined
): Promise<boolean> {
  request.log.warn(
    {
      url: request.url,
      method: request.method,
      ip: request.ip,
      hasHeaderToken: typeof tokenFromHeader === 'string',
      hasCookieToken: typeof tokenFromCookie === 'string',
      tokensMatch: tokenFromHeader === tokenFromCookie,
    },
    'CSRF token validation failed'
  );

  await reply.code(403).send({
    error: 'Forbidden',
    message: 'Invalid CSRF token',
    code: 'CSRF_TOKEN_INVALID',
  });
  return false;
}

async function validateStoredToken(
  request: FastifyRequest,
  reply: FastifyReply,
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Parameter intentionally unused
  _token: string
): Promise<boolean> {
  const sessionId = generateSessionId(request);
  const storedData = csrfTokenStore.get(sessionId);

  if (!storedData) {
    return sendTokenNotFoundError(request, reply, sessionId);
  }

  const now = Date.now();
  if (storedData.timestamp + TOKEN_EXPIRY < now) {
    csrfTokenStore.delete(sessionId);
    return sendTokenExpiredError(request, reply, {
      sessionId,
      now,
      tokenTimestamp: storedData.timestamp,
    });
  }

  return true;
}

async function sendTokenNotFoundError(
  request: FastifyRequest,
  reply: FastifyReply,
  sessionId: string
): Promise<boolean> {
  request.log.warn(
    {
      url: request.url,
      method: request.method,
      ip: request.ip,
      sessionId,
    },
    'CSRF token not found in store'
  );

  await reply.code(403).send({
    error: 'Forbidden',
    message: 'CSRF token expired or invalid',
    code: 'CSRF_TOKEN_EXPIRED',
  });
  return false;
}

interface TokenExpiredParams {
  sessionId: string;
  now: number;
  tokenTimestamp: number;
}

async function sendTokenExpiredError(
  request: FastifyRequest,
  reply: FastifyReply,
  params: TokenExpiredParams
): Promise<boolean> {
  request.log.warn(
    {
      url: request.url,
      method: request.method,
      ip: request.ip,
      sessionId: params.sessionId,
      tokenAge: params.now - params.tokenTimestamp,
    },
    'CSRF token expired'
  );

  await reply.code(403).send({
    error: 'Forbidden',
    message: 'CSRF token expired',
    code: 'CSRF_TOKEN_EXPIRED',
  });
  return false;
}
