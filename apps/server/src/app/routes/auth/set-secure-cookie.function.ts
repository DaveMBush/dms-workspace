import { FastifyReply } from 'fastify';

import { getAuthCookieName } from '../../utils/get-auth-cookie-name.function';

export function setSecureCookie(
  reply: FastifyReply,
  token: string,
  maxAge: number
): void {
  const cookieName = getAuthCookieName();

  reply.setCookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  });
}
