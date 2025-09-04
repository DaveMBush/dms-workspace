import { FastifyPluginAsync } from 'fastify';

import { checkDatabaseHealth } from '../../prisma/prisma-client.js';

const health: FastifyPluginAsync = async (fastify) => {
  // Basic health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Detailed health check with database connectivity
  fastify.get('/health/detailed', async (request, reply) => {
    const startTime = Date.now();

    try {
      // Check database health
      const dbHealth = await checkDatabaseHealth();
      const responseTime = Date.now() - startTime;

      if (!dbHealth.healthy) {
        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime,
          database: {
            status: 'unhealthy',
            error: dbHealth.error,
          },
          version: process.env.npm_package_version || 'unknown',
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime,
        database: {
          status: 'healthy',
          connectionCount: dbHealth.connectionCount,
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
        version: process.env.npm_package_version || 'unknown',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      reply.status(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        error:
          error instanceof Error ? error.message : 'Unknown health check error',
        version: process.env.npm_package_version || 'unknown',
      };
    }
  });

  // Database-specific health check
  fastify.get('/health/database', async (request, reply) => {
    try {
      const dbHealth = await checkDatabaseHealth();

      if (!dbHealth.healthy) {
        reply.status(503);
        return {
          status: 'unhealthy',
          error: dbHealth.error,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'healthy',
        connectionCount: dbHealth.connectionCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'unhealthy',
        error:
          error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Readiness probe - checks if the service is ready to receive traffic
  fastify.get('/ready', async (request, reply) => {
    try {
      const dbHealth = await checkDatabaseHealth();

      if (!dbHealth.healthy) {
        reply.status(503);
        return {
          ready: false,
          reason: 'Database not available',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503);
      return {
        ready: false,
        reason: error instanceof Error ? error.message : 'Service not ready',
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Liveness probe - checks if the service is alive
  fastify.get('/live', async (request, reply) => {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  });
};

export default health;
