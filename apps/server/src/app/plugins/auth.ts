import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { authenticateJWT } from '../middleware/authenticate-jwt.function';
import { AuthenticatedRequest } from '../middleware/authenticated-request.interface';

function isHealthCheckEndpoint(url: string): boolean {
  return (
    url === '/health' ||
    url === '/ready' ||
    url === '/live' ||
    url === '/api/health' ||
    url === '/api/ready' ||
    url === '/api/live' ||
    url.startsWith('/health/') ||
    url.startsWith('/api/health/') ||
    url === '/'
  );
}

function isDevEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return (
    nodeEnv === 'development' ||
    nodeEnv === 'test' ||
    nodeEnv === 'ci' ||
    (nodeEnv === 'local' && !(process.env.USE_LOCAL_SERVICES ?? ''))
  );
}

function shouldSkipAuth(url: string): boolean {
  return isHealthCheckEndpoint(url) || isDevEnvironment();
}

async function onRequestHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (shouldSkipAuth(request.url)) {
    return;
  }

  await authenticateJWT(request, reply);
}

function onResponseHook(request: FastifyRequest, reply: FastifyReply): void {
  if ('user' in request) {
    const authenticatedRequest = request as AuthenticatedRequest;
    request.log.debug(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        userId: authenticatedRequest.user?.sub,
      },
      'Request completed'
    );
  }
}

export default fp(
  function authPlugin(fastify: FastifyInstance): void {
    fastify.addHook('onRequest', onRequestHook);
    fastify.addHook('onResponse', onResponseHook);
  },
  {
    name: 'auth-plugin',
  }
);
