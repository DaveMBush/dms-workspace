import type { FastifyInstance } from 'fastify';

export default function registerFeatureFlagsRoutes(fastify: FastifyInstance): void {
  fastify.get('/', function handleGetFeatureFlags() {
    return {
      useScreenerForUniverse: process.env.USE_SCREENER_FOR_UNIVERSE === 'true'
    };
  });
}
