import * as crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

import { generateSessionId } from '../utils/generate-session-id.function';
import { CSRFTokenData } from './csrf-token-data.interface';
import { csrfTokenStore } from './csrf-token-store.constant';
import { TOKEN_EXPIRY } from './token-expiry.constant';

function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function generateCSRFTokenHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = generateCSRFToken();
  const sessionId = generateSessionId(request);
  const timestamp = Date.now();

  const tokenData: CSRFTokenData = {
    token,
    timestamp,
    sessionId,
  };

  // Store the token
  csrfTokenStore.set(sessionId, tokenData);

  // Set CSRF token in HTTP-only cookie
  reply.setCookie('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });

  // Also return in response body for client-side access
  await reply.send({
    csrfToken: token,
    expiresAt: new Date(timestamp + TOKEN_EXPIRY).toISOString(),
  });
}
