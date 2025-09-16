import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Creates security hooks for the security plugin
 */
export function createSecurityHooks(
  fastify: FastifyInstance,
  enableAuditLogging: boolean,
  enableRateLimit: boolean
): void {
  // Add onRequest security hook
  async function onRequestSecurityHook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { securityOnRequestHook } = await import(
      './security-on-request-hook.function.js'
    );
    await securityOnRequestHook(request, reply);
  }
  fastify.addHook('onRequest', onRequestSecurityHook);

  // Add onResponse audit logging hook if enabled
  if (enableAuditLogging) {
    async function onResponseAuditHook(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      const { securityOnResponseHook } = await import(
        './security-on-response-hook.function.js'
      );
      securityOnResponseHook(request, reply);
    }
    fastify.addHook('onResponse', onResponseAuditHook);
  }

  // Add rate limiting hook if enabled
  if (enableRateLimit) {
    async function onRequestRateLimitHook(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      // Skip rate limiting for health checks
      if (
        request.url === '/health' ||
        request.url === '/ready' ||
        request.url === '/live'
      ) {
        return;
      }

      // Apply global rate limiting to API endpoints
      if (request.url.startsWith('/api/')) {
        const { applyRateLimitingWithValidation } = await import(
          '../utils/apply-rate-limiting.function.js'
        );
        await applyRateLimitingWithValidation(request, reply);
      }
    }
    fastify.addHook('onRequest', onRequestRateLimitHook);
  }
}
