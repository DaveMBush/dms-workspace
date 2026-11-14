import * as crypto from 'crypto';
import { FastifyRequest } from 'fastify';

/**
 * Issue a fresh, unguessable session id on every call.
 *
 * The id is server-issued (random) and deliberately does NOT depend on any
 * client-supplied input (ip / user-agent / clock), so it cannot be guessed or
 * collided by an attacker who knows the client inputs. Callers that need to
 * correlate a later request with this issuance must carry the issued id back
 * via the `sessionId` cookie / `x-session-id` header (see
 * `extractSessionIdFromRequest`).
 */
export function generateSessionId(
  // eslint-disable-next-line @typescript-eslint/naming-convention -- kept for API compatibility; intentionally unused because the id must not derive from any client-supplied input (ip / user-agent / clock)
  _request: FastifyRequest,
): string {
  return crypto.randomBytes(32).toString('hex');
}
