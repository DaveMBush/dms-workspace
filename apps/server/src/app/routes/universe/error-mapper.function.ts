import type { FastifyReply } from 'fastify';

/** HTTP statuses this domain's failure mapper may emit (4xx/5xx only). */
type FailureStatus = 400 | 401 | 403 | 404 | 409 | 500 | 503;

/** Body shape for a universe-domain failure response. */
type FailureBody = Record<string, unknown>;

/**
 * Shared per-domain failure emitter (Story 14.2). Both `universe/index.ts` and
 * `universe/add-symbol/index.ts` delegate their `.status(4xx/5xx).send(...)`
 * responses here instead of hand-rolling them, so the domain has one mapper.
 * Each route passes its exact status + body to preserve response shapes (AC #3).
 */
export function sendUniverseFailure(
  reply: FastifyReply,
  statusCode: FailureStatus,
  body: FailureBody,
): void {
  reply.status(statusCode).send(body);
}
