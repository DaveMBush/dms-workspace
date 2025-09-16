import { FastifyRequest } from 'fastify';

export function createMockRequest(): Pick<
  FastifyRequest,
  'ip' | 'method' | 'url'
> {
  return {
    ip: 'unknown',
    url: 'cors-check',
    method: 'OPTIONS',
  };
}
