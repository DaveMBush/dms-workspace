import { FastifyReply } from 'fastify';

interface SetSecureCookieBody {
  token: string;
  expirationDate: string;
}

const REQUIRED_FIELDS_MESSAGE = 'Token and expiration date are required';
const INVALID_EXPIRATION_MESSAGE = 'Expiration date must be in the future';

export async function validateCookieRequest(
  body: SetSecureCookieBody,
  reply: FastifyReply
): Promise<{ isValid: boolean; expiresAt?: Date; maxAge?: number }> {
  const { token, expirationDate } = body;

  if (!token || !expirationDate) {
    await reply.code(400).send({
      error: 'Bad Request',
      message: REQUIRED_FIELDS_MESSAGE,
    });
    return { isValid: false };
  }

  const expiresAt = new Date(expirationDate);
  const now = new Date();

  if (expiresAt <= now) {
    await reply.code(400).send({
      error: 'Bad Request',
      message: INVALID_EXPIRATION_MESSAGE,
    });
    return { isValid: false };
  }

  // Calculate max age in seconds
  const maxAge = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

  return { isValid: true, expiresAt, maxAge };
}
