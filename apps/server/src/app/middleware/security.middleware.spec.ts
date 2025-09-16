import { FastifyReply, FastifyRequest } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createSecurityConfig } from './create-security-config.function';
import { securityHeaders } from './security.middleware';

describe('SecurityMiddleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      protocol: 'https',
    };

    mockReply = {
      header: vi.fn().mockReturnThis(),
      removeHeader: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  describe('createSecurityConfig', () => {
    it('should create development config with report-only CSP', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const config = createSecurityConfig();

      expect(config.csp.reportOnly).toBe(true);
      expect(config.csp.directives['script-src']).toContain("'unsafe-eval'");
    });

    it('should create production config with enforced CSP', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const config = createSecurityConfig();

      expect(config.csp.reportOnly).toBe(false);
      expect(config.csp.directives['script-src']).not.toContain(
        "'unsafe-eval'"
      );
    });

    it('should include required CSP directives', () => {
      const config = createSecurityConfig();

      expect(config.csp.directives).toHaveProperty('default-src');
      expect(config.csp.directives).toHaveProperty('script-src');
      expect(config.csp.directives).toHaveProperty('style-src');
      expect(config.csp.directives).toHaveProperty('frame-ancestors');
      expect(config.csp.directives['frame-ancestors']).toEqual(["'none'"]);
    });
  });

  describe('securityHeaders', () => {
    it('should set CSP header in development (report-only)', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy-Report-Only',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should set CSP header in production (enforced)', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should set HSTS header in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should set HSTS header over HTTPS', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockRequest.protocol = 'https';

      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000')
      );
    });

    it('should set all security headers', async () => {
      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
      );
    });

    it('should remove server information headers', async () => {
      securityHeaders(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.removeHeader).toHaveBeenCalledWith('Server');
      expect(mockReply.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });
  });
});
