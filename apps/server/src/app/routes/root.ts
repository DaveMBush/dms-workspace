import { FastifyInstance } from 'fastify';

export default function registerRootRoutes(fastify: FastifyInstance): void {
  fastify.get('/', function handleRootRequest(): { message: string } {
    return { message: 'Hello API' };
  });
}
