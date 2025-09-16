import { cognitoConfigProd } from './cognito-config-prod';

// Production Environment Configuration
export const environment = {
  production: true,
  apiUrl: 'PLACEHOLDER_API_URL', // Will be replaced during deployment
  enableLogging: false,
  features: {
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
  },
  cache: {
    enableServiceWorker: true,
    cacheVersion: '1.0.0',
  },
  security: {
    enableCSP: true,
    strictSSL: true,
    useSecureCookies: true,
    csrfProtection: true,
    rateLimitingEnabled: true,
    auditLoggingEnabled: true,
    cspEnabled: true,
    hstsEnabled: true,
    securityHeaders: true,
  },
  auth: {
    useMockAuth: false, // Production should always use real AWS Cognito
    tokenStorage: 'secure-cookies', // Use secure HTTP-only cookies
    sessionTimeout: 3600000, // 1 hour
    refreshTokenGracePeriod: 300000, // 5 minutes
  },
  api: {
    baseUrl: 'PLACEHOLDER_API_URL',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  monitoring: {
    enablePerformanceMonitoring: true,
    enableSecurityMonitoring: true,
    logLevel: 'warn',
    errorReporting: {
      enabled: true,
      sampleRate: 1.0,
    },
  },
  rateLimit: {
    enabled: true,
    requests: 1000,
    windowMs: 900000, // 15 minutes
  },
  cognito: cognitoConfigProd,
};
