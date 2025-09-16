import { FastifyReply, FastifyRequest } from 'fastify';

import { validateCSRFToken } from './validate-csrf-token.function';

export async function csrfProtectionHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const isValid = await validateCSRFToken(request, reply);
  if (!isValid) {
    // Response already sent in validateCSRFToken
    return;
  }
}
