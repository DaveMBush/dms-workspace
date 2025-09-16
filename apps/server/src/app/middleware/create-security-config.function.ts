import { SecurityConfig } from './security-config.interface';

export function createSecurityConfig(): SecurityConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isDevelopment = nodeEnv === 'development';

  return {
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          'https://cognito-identity.amazonaws.com',
          'https://cognito-idp.amazonaws.com',
          ...(isDevelopment ? ["'unsafe-eval'"] : []),
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': [
          "'self'",
          'https://*.amazonaws.com',
          'https://cognito-idp.us-east-1.amazonaws.com',
          'https://cognito-identity.us-east-1.amazonaws.com',
          ...(process.env.API_BASE_URL !== null &&
          process.env.API_BASE_URL !== undefined &&
          process.env.API_BASE_URL.length > 0
            ? [process.env.API_BASE_URL]
            : []),
          ...(isDevelopment
            ? ['https://localhost:*', 'wss://localhost:*']
            : []),
        ],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'object-src': ["'none'"],
      },
      reportUri: '/api/csp-report',
      reportOnly: isDevelopment,
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  };
}
