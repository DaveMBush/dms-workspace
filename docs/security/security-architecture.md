# Security Architecture Documentation

## Overview

The DMS application implements comprehensive security hardening and production-ready authentication configurations to protect against common security vulnerabilities and meet enterprise security standards.

## Security Architecture

### Multi-Layer Security Approach

```
┌─────────────────────────────────────────────────────────────┐
│ Browser Security Layer                                      │
│ • Content Security Policy (CSP)                            │
│ • Secure HTTP-only cookies                                 │
│ • HTTPS enforcement                                         │
│ • Security headers (HSTS, X-Frame-Options, etc.)          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Network Security Layer                                      │
│ • CORS with strict origin validation                       │
│ • Rate limiting (adaptive & per-endpoint)                  │
│ • CSRF protection                                           │
│ • Input validation & sanitization                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Security Layer                                  │
│ • JWT token validation                                      │
│ • Token blacklisting & revocation                          │
│ • Session management                                        │
│ • Audit logging & monitoring                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ AWS Cognito Security Layer                                  │
│ • User authentication & authorization                       │
│ • MFA support                                               │
│ • Password policies                                         │
│ • Account lockout mechanisms                                │
└─────────────────────────────────────────────────────────────┘
```

## Implemented Security Features

### 1. Secure HTTP-only Cookie Authentication

**Location**: `apps/dms/src/app/auth/services/secure-cookie.service.ts`

- **HTTP-only cookies**: Prevents XSS attacks by making tokens inaccessible to JavaScript
- **Secure flag**: Ensures cookies are only sent over HTTPS in production
- **SameSite=Strict**: Prevents CSRF attacks
- **Automatic expiration**: Cookies expire with token lifetime
- **CSRF protection**: All cookie operations require valid CSRF tokens

**Configuration**:

```typescript
reply.setCookie('__Secure-auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: tokenLifetime,
  path: '/',
});
```

### 2. Content Security Policy (CSP)

**Location**: `apps/server/src/app/middleware/security.middleware.ts`

- **Script restrictions**: Only allows scripts from trusted sources
- **Style restrictions**: Prevents unauthorized stylesheets
- **Frame protection**: Prevents clickjacking with frame-ancestors 'none'
- **Reporting**: CSP violations are logged for monitoring
- **Development mode**: More permissive for development, strict for production

**Policy Example**:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cognito-identity.amazonaws.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
frame-ancestors 'none';
```

### 3. Enhanced Rate Limiting

**Location**: `apps/server/src/app/middleware/enhanced-rate-limit.middleware.ts`

- **Per-endpoint limits**: Different limits for login, password reset, token refresh
- **Adaptive limiting**: Stricter limits based on failure patterns
- **Client fingerprinting**: Uses IP + User-Agent for more specific limiting
- **Graceful degradation**: Headers inform clients of limits and retry times

**Rate Limits**:

- Login: 5 attempts per 15 minutes
- Password reset: 3 attempts per hour
- Token refresh: 10 attempts per minute
- General API: 60 requests per minute

### 4. CSRF Protection

**Location**: `apps/server/src/app/middleware/csrf.middleware.ts`

- **Token generation**: Cryptographically secure random tokens
- **Double submit cookies**: Tokens in both cookie and header
- **Token expiration**: 30-minute token lifetime
- **Automatic cleanup**: Expired tokens are removed periodically

### 5. Production-Ready CORS

**Location**: `apps/server/src/app/plugins/cors.ts`

- **Strict origin validation**: Exact domain matching in production
- **Development flexibility**: Allows localhost patterns in development
- **Credentials support**: Enables secure cookie transmission
- **Security logging**: Unauthorized CORS attempts are logged

### 6. Comprehensive Audit Logging

**Location**: `apps/server/src/app/services/audit-log.service.ts`

- **Structured logging**: JSON format with correlation IDs
- **Risk-based classification**: LOW, MEDIUM, HIGH, CRITICAL levels
- **Privacy compliance**: IP address hashing for GDPR compliance
- **Real-time alerting**: High-risk events trigger immediate alerts
- **Buffer management**: Efficient batching and flushing

**Logged Events**:

- Authentication success/failure
- Logout events
- Token refresh operations
- Security violations (CSRF, rate limiting)
- Suspicious activities

### 7. Token Blacklisting & Revocation

**Location**: `apps/server/src/app/routes/auth/index.ts`

- **Immediate revocation**: Tokens are blacklisted on logout
- **Server-side validation**: All requests check blacklist
- **Automatic cleanup**: Expired entries are removed
- **Audit trail**: All revocations are logged

## Security Headers

The following security headers are automatically applied to all responses:

```
Content-Security-Policy: [policy]
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Environment Configuration

### Production Security Settings

**File**: `apps/dms/src/environments/environment.prod.ts`

```typescript
security: {
  useSecureCookies: true,
  csrfProtection: true,
  rateLimitingEnabled: true,
  auditLoggingEnabled: true,
  cspEnabled: true,
  hstsEnabled: true,
  securityHeaders: true,
}
```

### Development Considerations

- CSP is in report-only mode for development
- Rate limiting is more permissive for localhost
- CORS allows localhost with any port
- Audit logging includes more detailed information

## Monitoring and Alerting

### Security Events Monitoring

1. **Authentication Failures**: Track failed login attempts
2. **Rate Limiting**: Monitor excessive request patterns
3. **CSRF Violations**: Detect potential CSRF attacks
4. **Token Abuse**: Blacklisted token usage attempts
5. **Suspicious Activities**: Unusual access patterns

### Alert Thresholds

- **HIGH**: Multiple failed authentications from same IP
- **CRITICAL**: CSRF or XSS attack attempts
- **MEDIUM**: Rate limiting triggered repeatedly

### Statistics Endpoint

Development endpoint: `GET /api/security/stats`

Provides real-time security statistics:

- Rate limit counters
- CSRF token statistics
- Token blacklist status
- Audit log buffer status

## Compliance Considerations

### GDPR Compliance

- **IP Address Hashing**: Client IPs are hashed for privacy
- **Data Minimization**: Only necessary data is logged
- **Retention Policies**: Audit logs have configurable retention
- **Right to be Forgotten**: User data can be purged from logs

### SOC 2 Compliance

- **Access Controls**: All API access is authenticated
- **Audit Logging**: Comprehensive audit trail
- **Encryption**: All data in transit is encrypted
- **Monitoring**: Real-time security monitoring

## Security Testing

### Automated Security Testing

The following security tests are implemented:

1. **OWASP ZAP Integration**: Automated vulnerability scanning
2. **CSP Validation**: Policy enforcement testing
3. **Rate Limiting Tests**: Limit enforcement verification
4. **CSRF Protection Tests**: Token validation testing
5. **Authentication Tests**: JWT validation and blacklist testing

### Manual Security Testing

Regular security assessments should include:

1. **Penetration Testing**: External security assessment
2. **Code Review**: Security-focused code review
3. **Configuration Review**: Security settings validation
4. **Dependency Scanning**: Third-party vulnerability scanning

## Incident Response

### Security Incident Classification

1. **Level 1 (LOW)**: Normal authentication events
2. **Level 2 (MEDIUM)**: Rate limiting, failed authentications
3. **Level 3 (HIGH)**: CSRF violations, suspicious patterns
4. **Level 4 (CRITICAL)**: Active attacks, data breaches

### Response Procedures

1. **Immediate**: Automatic rate limiting and blocking
2. **Short-term**: Alert security team, investigate patterns
3. **Long-term**: Update security policies, patch vulnerabilities

### Recovery Procedures

1. **Token Revocation**: Immediate blacklisting of compromised tokens
2. **User Notification**: Inform affected users
3. **System Hardening**: Update security configurations
4. **Monitoring Enhancement**: Improve detection capabilities

## Security Configuration Checklist

### Production Deployment

- [ ] HTTPS enforced (HSTS enabled)
- [ ] Secure cookies enabled
- [ ] CSP headers in enforcement mode
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] Audit logging configured
- [ ] CORS restricted to production domains
- [ ] Security headers enabled
- [ ] Token blacklisting operational
- [ ] Monitoring and alerting configured

### Development Environment

- [ ] CSP in report-only mode
- [ ] Localhost CORS enabled
- [ ] Development-friendly rate limits
- [ ] Audit logging enabled
- [ ] Security testing tools integrated

## Maintenance Procedures

### Regular Security Tasks

1. **Weekly**: Review security logs and alerts
2. **Monthly**: Update dependency vulnerabilities
3. **Quarterly**: Security configuration review
4. **Annually**: Penetration testing and security audit

### Security Updates

1. **Immediate**: Critical security patches
2. **Scheduled**: Regular security updates
3. **Tested**: All updates tested in staging environment

## Contact Information

For security issues or questions:

- **Security Team**: security@company.com
- **Incident Response**: incident-response@company.com
- **Emergency**: security-emergency@company.com

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Next Review**: 2025-04-15
