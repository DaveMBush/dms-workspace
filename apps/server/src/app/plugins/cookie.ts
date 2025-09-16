import cookie from '@fastify/cookie';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(
  async function cookiePlugin(fastify: FastifyInstance): Promise<void> {
    await fastify.register(cookie, {
      secret:
        process.env.COOKIE_SECRET ?? 'default-secret-change-in-production',
      parseOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    });

    fastify.log.info('Cookie plugin registered');
  },
  {
    name: 'cookie-plugin',
  }
);
