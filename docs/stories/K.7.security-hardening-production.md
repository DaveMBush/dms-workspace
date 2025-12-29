# Story K.7: Security Hardening and Production Readiness

## Status

Draft

## Story

**As a** single-user application owner,
**I want** to have comprehensive security hardening and production-ready authentication configurations,
**so that** my DMS application is protected against common security vulnerabilities and meets enterprise security standards for production deployment.

## Acceptance Criteria

1. Configure secure HTTP-only cookies for token storage as alternative to localStorage with proper security attributes
2. Implement Content Security Policy (CSP) headers to prevent XSS attacks and unauthorized resource loading
3. Add rate limiting for login attempts and authentication endpoints to prevent brute force attacks
4. Configure proper CORS policies for production domains with whitelist approach and credential handling
5. Implement secure logout with token revocation and server-side session termination
6. Add comprehensive audit logging for authentication events, security incidents, and user actions
7. Perform security testing for common vulnerabilities including XSS, CSRF, and session fixation
8. Document security configuration, incident response procedures, and compliance considerations
9. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run dms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run dms:lint`
- `pnpm nx run dms:build:production`
- `pnpm nx run dms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Implement secure HTTP-only cookie authentication** (AC: 1)

  - [ ] Create secure cookie service for token storage instead of sessionStorage/localStorage
  - [ ] Configure cookie attributes: HttpOnly, Secure, SameSite=Strict, proper expiration
  - [ ] Update authentication service to use secure cookies for token storage
  - [ ] Add CSRF token handling for state-changing operations
  - [ ] Implement cookie-based authentication for both frontend and backend
  - [ ] Test secure cookie functionality across different browsers and scenarios

- [ ] **Task 2: Implement Content Security Policy (CSP) headers** (AC: 2)

  - [ ] Configure CSP headers in Fastify server to prevent XSS attacks
  - [ ] Define allowed sources for scripts, styles, images, and other resources
  - [ ] Add nonce-based CSP for inline scripts and styles in Angular application
  - [ ] Configure CSP reporting endpoint to monitor policy violations
  - [ ] Test CSP implementation with browser developer tools and security scanners
  - [ ] Document CSP policy and maintenance procedures for future updates

- [ ] **Task 3: Add rate limiting for authentication endpoints** (AC: 3)

  - [ ] Implement rate limiting middleware for login, password reset, and token refresh endpoints
  - [ ] Configure adaptive rate limits: stricter limits after failed attempts
  - [ ] Add IP-based rate limiting with Redis or in-memory storage
  - [ ] Implement account lockout mechanisms after repeated failed attempts
  - [ ] Add rate limit bypass for legitimate administrative access
  - [ ] Create monitoring and alerting for suspicious authentication patterns

- [ ] **Task 4: Configure production CORS policies** (AC: 4)

  - [ ] Update CORS configuration with production domain whitelist
  - [ ] Implement environment-specific CORS settings (dev, staging, prod)
  - [ ] Configure proper preflight handling for authenticated requests
  - [ ] Add CORS credential handling for cookie-based authentication
  - [ ] Implement CORS origin validation with exact domain matching
  - [ ] Test CORS configuration with production domains and subdomains

- [ ] **Task 5: Implement secure logout with token revocation** (AC: 5)

  - [ ] Add server-side token blacklisting for immediate token invalidation
  - [ ] Implement AWS Cognito global sign out for all user sessions
  - [ ] Add secure logout endpoint with proper session cleanup
  - [ ] Clear all authentication cookies and client-side state on logout
  - [ ] Add logout confirmation with session information display
  - [ ] Test logout functionality across multiple browser tabs and devices

- [ ] **Task 6: Add comprehensive audit logging and monitoring** (AC: 6)

  - [ ] Implement structured logging for all authentication events
  - [ ] Add security event logging: failed logins, token refresh, logout events
  - [ ] Create audit trail for user actions and administrative operations
  - [ ] Configure log aggregation and monitoring with correlation IDs
  - [ ] Add real-time security alerting for suspicious activities
  - [ ] Implement log retention policies and secure log storage

- [ ] **Task 7: Perform security testing and vulnerability assessment** (AC: 7)

  - [ ] Conduct automated security testing with tools like OWASP ZAP or similar
  - [ ] Test for XSS vulnerabilities in all user input and output scenarios
  - [ ] Verify CSRF protection for all state-changing operations
  - [ ] Test session management and fixation vulnerabilities
  - [ ] Perform authentication bypass testing and privilege escalation
  - [ ] Document security test results and remediation actions

- [ ] **Task 8: Create security documentation and procedures** (AC: 8)
  - [ ] Document security architecture and authentication flow diagrams
  - [ ] Create incident response procedures for security breaches
  - [ ] Document compliance considerations (GDPR, SOC 2, etc.)
  - [ ] Create security configuration checklist for deployment
  - [ ] Add security monitoring and alerting procedures
  - [ ] Document security update and patch management procedures

## Dev Notes

### Previous Story Context

**Dependencies:**

- Stories K.1-K.6 provide complete authentication system foundation
- All previous authentication components must be hardened for production
- Existing token storage, session management, and user profile systems

### Data Models and Architecture

**Source: [docs/backlog/epic-k-authentication-security.md]**

- Production deployment requirements and security considerations
- AWS Cognito integration with enterprise security standards
- Single-user application with high security requirements

**Security Architecture:**

```
Production Environment -> WAF/CDN -> Load Balancer -> Application
         ↓                  ↓           ↓              ↓
    Security Headers    Rate Limiting  SSL/TLS     Secure Cookies
```

**Authentication Security Layers:**

```
Browser Security (CSP, Secure Cookies) -> Application Security (Rate Limiting, CORS)
-> AWS Cognito Security -> Backend Security (JWT Validation, Audit Logging)
```

### File Locations

**Primary Files to Create:**

1. `/apps/server/src/app/middleware/security.middleware.ts` - Security headers and CSP
2. `/apps/server/src/app/middleware/rate-limit.middleware.ts` - Rate limiting implementation
3. `/apps/server/src/app/services/audit-log.service.ts` - Audit logging service
4. `/apps/dms/src/app/auth/services/secure-cookie.service.ts` - Secure cookie management
5. `/apps/server/src/app/security/csrf.middleware.ts` - CSRF protection
6. `/docs/security/security-architecture.md` - Security documentation

**Primary Files to Modify:**

1. `/apps/server/src/app/app.ts` - Add security middleware and configuration
2. `/apps/dms/src/app/auth/auth.service.ts` - Update to use secure cookies
3. `/apps/server/src/app/middleware/auth.middleware.ts` - Add audit logging
4. `/apps/dms/src/environments/environment.prod.ts` - Production security config
**Configuration Files:**

1. `/apps/server/src/config/security.config.ts` - Security configuration
2. `/infrastructure/security/csp.config.ts` - CSP policy configuration
3. `/infrastructure/security/rate-limits.config.ts` - Rate limiting rules

### Technical Implementation Details

**Security Middleware with CSP:**

```typescript
// apps/server/src/app/middleware/security.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export interface SecurityConfig {
  csp: {
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly: boolean;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  cors: {
    origin: string[];
    credentials: boolean;
    allowedHeaders: string[];
  };
}

export const securityConfig: SecurityConfig = {
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cognito-identity.amazonaws.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://*.amazonaws.com', 'https://api.dms-app.com'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
    },
    reportUri: '/api/csp-report',
    reportOnly: false,
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  cors: {
    origin: [process.env.FRONTEND_URL || 'https://dms.yourdomain.com', ...(process.env.NODE_ENV === 'development' ? ['http://localhost:4200'] : [])],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  },
};

export async function securityHeaders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Content Security Policy
  const cspValue = Object.entries(securityConfig.csp.directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

  reply.header(securityConfig.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', cspValue);

  // HSTS Header
  const hstsValue = `max-age=${securityConfig.hsts.maxAge}${securityConfig.hsts.includeSubDomains ? '; includeSubDomains' : ''}${securityConfig.hsts.preload ? '; preload' : ''}`;

  reply.header('Strict-Transport-Security', hstsValue);

  // Additional Security Headers
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}
```

**Rate Limiting Middleware:**

```typescript
// apps/server/src/app/middleware/rate-limit.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const rateLimitConfigs = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
    skipSuccessfulRequests: true,
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    skipSuccessfulRequests: false,
  },
  tokenRefresh: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 refreshes per minute
    skipSuccessfulRequests: true,
  },
};

// In-memory rate limiter (use Redis in production)
const rateLimiters = {
  login: new RateLimiterMemory({
    points: rateLimitConfigs.login.maxRequests,
    duration: rateLimitConfigs.login.windowMs / 1000,
  }),
  passwordReset: new RateLimiterMemory({
    points: rateLimitConfigs.passwordReset.maxRequests,
    duration: rateLimitConfigs.passwordReset.windowMs / 1000,
  }),
  tokenRefresh: new RateLimiterMemory({
    points: rateLimitConfigs.tokenRefresh.maxRequests,
    duration: rateLimitConfigs.tokenRefresh.windowMs / 1000,
  }),
};

export function createRateLimiter(type: keyof typeof rateLimiters) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.ip || 'unknown';
    const rateLimiter = rateLimiters[type];

    try {
      await rateLimiter.consume(key);
    } catch (rateLimiterRes) {
      const remainingPoints = rateLimiterRes.remainingPoints || 0;
      const msBeforeNext = rateLimiterRes.msBeforeNext || 0;

      request.log.warn(
        {
          ip: request.ip,
          rateLimitType: type,
          remainingPoints,
          msBeforeNext,
        },
        'Rate limit exceeded'
      );

      reply.header('Retry-After', Math.round(msBeforeNext / 1000));
      reply.header('X-RateLimit-Limit', rateLimitConfigs[type].maxRequests);
      reply.header('X-RateLimit-Remaining', remainingPoints);
      reply.header('X-RateLimit-Reset', new Date(Date.now() + msBeforeNext).toISOString());

      return reply.code(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${type}. Try again in ${Math.ceil(msBeforeNext / 1000)} seconds.`,
        retryAfter: msBeforeNext,
      });
    }
  };
}
```

**Secure Cookie Service:**

```typescript
// apps/dms/src/app/auth/services/secure-cookie.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SecureCookieService {
  private readonly SECURE_TOKEN_NAME = '__Secure-auth-token';
  private readonly CSRF_TOKEN_NAME = 'csrf-token';

  setSecureToken(token: string, expirationDate: Date): void {
    // Set secure HTTP-only cookie via server endpoint
    this.sendTokenToServer(token, expirationDate);
  }

  async getCSRFToken(): Promise<string> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  }

  private async sendTokenToServer(token: string, expirationDate: Date): Promise<void> {
    try {
      const csrfToken = await this.getCSRFToken();

      await fetch('/api/auth/set-secure-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          expirationDate: expirationDate.toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to set secure cookie:', error);
      throw error;
    }
  }

  async clearSecureTokens(): Promise<void> {
    try {
      const csrfToken = await this.getCSRFToken();

      await fetch('/api/auth/clear-cookies', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to clear secure cookies:', error);
    }
  }
}
```

**Audit Logging Service:**

```typescript
// apps/server/src/app/services/audit-log.service.ts
import { Injectable } from '@angular/core';

export interface AuditEvent {
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PROFILE_UPDATE' | 'SECURITY_VIOLATION';
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly LOG_ENDPOINT = process.env.AUDIT_LOG_ENDPOINT || 'cloudwatch';

  async logSecurityEvent(event: AuditEvent): Promise<void> {
    try {
      // Structure the log event
      const logEntry = {
        timestamp: event.timestamp.toISOString(),
        eventType: event.eventType,
        userId: event.userId || 'anonymous',
        sessionId: event.sessionId,
        source: {
          ipAddress: this.hashIP(event.ipAddress),
          userAgent: event.userAgent,
          origin: 'dms-application',
        },
        details: event.details,
        riskLevel: event.riskLevel,
        correlationId: this.generateCorrelationId(),
      };

      // Send to logging service (CloudWatch, Splunk, etc.)
      await this.sendToLogService(logEntry);

      // For high-risk events, trigger immediate alerting
      if (event.riskLevel === 'HIGH' || event.riskLevel === 'CRITICAL') {
        await this.triggerSecurityAlert(logEntry);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to local logging
      console.log('AUDIT:', JSON.stringify(event));
    }
  }

  private async sendToLogService(logEntry: any): Promise<void> {
    // Implementation depends on chosen logging service
    // Example: AWS CloudWatch, Datadog, Splunk, etc.
  }

  private async triggerSecurityAlert(logEntry: any): Promise<void> {
    // Implementation for real-time security alerting
    // Example: SNS, Slack webhook, PagerDuty, etc.
  }

  private hashIP(ipAddress: string): string {
    // Hash IP address for privacy compliance
    return Buffer.from(ipAddress).toString('base64').substring(0, 16);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
}
```

**Production Environment Configuration:**

```typescript
// apps/dms/src/environments/environment.prod.ts
export const environment = {
  production: true,
  cognito: {
    region: 'us-east-1',
    userPoolId: process.env['COGNITO_USER_POOL_ID']!,
    userPoolWebClientId: process.env['COGNITO_USER_POOL_CLIENT_ID']!,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
  security: {
    useSecureCookies: true,
    csrfProtection: true,
    rateLimitingEnabled: true,
    auditLoggingEnabled: true,
    cspEnabled: true,
  },
  api: {
    baseUrl: process.env['API_BASE_URL'] || 'https://api.dms-app.com',
    timeout: 30000,
  },
  monitoring: {
    enablePerformanceMonitoring: true,
    enableSecurityMonitoring: true,
    logLevel: 'warn',
  },
};
```

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest for unit tests, OWASP ZAP for security testing
**Test Location:** Security tests in dedicated security test directory
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Security Testing Strategy:**

- **Automated Security Testing:** OWASP ZAP integration in CI/CD pipeline
- **Manual Penetration Testing:** Quarterly security assessments
- **Vulnerability Scanning:** Regular dependency and infrastructure scans
- **Compliance Testing:** GDPR, SOC 2, and other regulatory requirements

**Key Security Test Scenarios:**

- CSP policy enforcement and violation reporting
- Rate limiting effectiveness under load
- Secure cookie configuration and HttpOnly attributes
- CSRF protection for all state-changing operations
- XSS prevention in user inputs and outputs
- Session management and fixation prevention
- Authentication bypass and privilege escalation
- Audit logging completeness and integrity

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
