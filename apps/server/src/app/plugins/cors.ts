import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { buildAllowedOrigins } from './cors-config.function';
import { createCorsOriginHandler } from './cors-origin-handler.function';

/**
 * Production-ready CORS plugin with security hardening
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(
  async function corsPlugin(fastify: FastifyInstance): Promise<void> {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const isProduction = nodeEnv === 'production';
    const allowedOrigins = buildAllowedOrigins();
    const originHandler = createCorsOriginHandler(
      allowedOrigins,
      nodeEnv,
      fastify.log
    );

    await fastify.register(cors, {
      origin: originHandler,
      credentials: true, // Required for secure cookies
      allowedHeaders: [
        'Content-Type',
        'Authorization', // JWT tokens
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'X-Request-ID',
        'X-CSRF-Token', // CSRF protection
        'Cache-Control',
        'Pragma',
        'X-Forwarded-For',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      // Preflight cache time (shorter in production for security)
      maxAge: isProduction ? 3600 : 86400, // 1 hour in prod, 24 hours in dev
      // Additional security options
      optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
      preflightContinue: false, // Disable CORS preflight delegation
    });

    fastify.log.info(
      {
        allowedOrigins,
        environment: nodeEnv,
        corsEnabled: true,
        credentials: true,
      },
      'CORS plugin initialized with security hardening'
    );
  },
  {
    name: 'cors-plugin',
  }
);
