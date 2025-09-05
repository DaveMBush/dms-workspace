import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * CORS plugin configuration for authentication support
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(
  async function corsPlugin(fastify: FastifyInstance): Promise<void> {
    const allowedOrigins = [
      'http://localhost:4200', // Development Angular app
      'http://localhost:3000', // Alternative dev port
      process.env.FRONTEND_URL, // Production frontend URL
      process.env.ALLOWED_ORIGIN, // Additional allowed origin
    ].filter(Boolean); // Remove undefined values

    await fastify.register(cors, {
      origin: function corsOriginHandler(origin, callback) {
        // Allow requests with no origin (mobile apps, server-to-server)
        if (origin === undefined) {
          callback(null, true);
          return;
        }

        // Allow configured origins
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        // Allow localhost for development (with any port)
        if (
          process.env.NODE_ENV === 'development' &&
          origin.startsWith('http://localhost:')
        ) {
          callback(null, true);
          return;
        }

        fastify.log.warn({ origin, allowedOrigins }, 'CORS origin not allowed');
        callback(new Error('Not allowed by CORS'), false);
      },

      credentials: true, // Allow cookies/auth headers

      allowedHeaders: [
        'Content-Type',
        'Authorization', // Required for JWT tokens
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'X-Request-ID',
      ],

      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

      // Preflight cache time (24 hours)
      maxAge: 86400,
    });
  },
  {
    name: 'cors-plugin',
  }
);
