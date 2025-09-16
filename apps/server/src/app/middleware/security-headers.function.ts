import { FastifyReply, FastifyRequest } from 'fastify';

import { createSecurityConfig } from './create-security-config.function';

export function securityHeaders(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const config = createSecurityConfig();

  // Content Security Policy
  function formatDirective([directive, sources]: [string, string[]]): string {
    return `${directive} ${sources.join(' ')}`;
  }

  const cspValue = Object.entries(config.csp.directives)
    .map(formatDirective)
    .join('; ');

  reply.header(
    config.csp.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy',
    cspValue
  );

  // HSTS Header (only in production and over HTTPS)
  if (process.env.NODE_ENV === 'production' || request.protocol === 'https') {
    const hstsValue = `max-age=${config.hsts.maxAge}${
      config.hsts.includeSubDomains ? '; includeSubDomains' : ''
    }${config.hsts.preload ? '; preload' : ''}`;

    reply.header('Strict-Transport-Security', hstsValue);
  }

  // Additional Security Headers
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );

  // Remove server information
  reply.removeHeader('Server');
  reply.removeHeader('X-Powered-By');
}
