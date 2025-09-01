import type { FastifyInstance } from 'fastify';

export default function registerFeatureFlagsRoutes(
  fastify: FastifyInstance
): void {
  fastify.get('/', function handleGetFeatureFlags() {
    return {
      useScreenerForUniverse: true,
    };
  });
}
