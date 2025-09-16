import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { auditLogService } from '../services/audit-log-service.instance';

interface SecurityPluginOptions {
  enableCSP?: boolean;
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  enableAuditLogging?: boolean;
}

interface CSPReportBody {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- CSP standard uses kebab-case
  'csp-report': Record<string, unknown>;
}

async function cspReportHandler(
  request: FastifyRequest<{ Body: CSPReportBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const report = request.body['csp-report'];

    if (
      report !== null &&
      report !== undefined &&
      Object.keys(report).length > 0
    ) {
      // Log CSP violation
      auditLogService.logSecurityViolation(request, 'csp_violation', {
        cspReport: report,
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        originalPolicy: report['original-policy'],
      });

      request.log.warn(
        {
          cspReport: report,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
        'CSP violation reported'
      );
    }

    await reply.code(204).send();
  } catch (error) {
    request.log.error(error, 'Error handling CSP report');
    await reply.code(500).send({ error: 'Internal Server Error' });
  }
}

export default fp<SecurityPluginOptions>(
  async function securityPlugin(
    fastify: FastifyInstance,
    opts: SecurityPluginOptions = {}
  ): Promise<void> {
    const {
      enableCSP = true,
      enableCSRF = process.env.NODE_ENV === 'production',
      enableRateLimit = true,
      enableAuditLogging = true,
    } = opts;

    // Register CSP report endpoint
    if (enableCSP) {
      fastify.post('/api/csp-report', cspReportHandler);
    }

    // Add security hooks using helper function
    const { createSecurityHooks } = await import(
      './security-hooks.function.js'
    );
    createSecurityHooks(fastify, enableAuditLogging, enableRateLimit);

    // Register security information endpoint (development only)
    if (process.env.NODE_ENV === 'development') {
      const { securityStatsHandler } = await import(
        './security-stats-handler.function.js'
      );
      fastify.get('/api/security/stats', securityStatsHandler);
    }

    fastify.log.info(
      {
        csp: enableCSP,
        csrf: enableCSRF,
        rateLimit: enableRateLimit,
        auditLogging: enableAuditLogging,
      },
      'Security plugin initialized'
    );
  },
  {
    name: 'security-plugin',
  }
);
