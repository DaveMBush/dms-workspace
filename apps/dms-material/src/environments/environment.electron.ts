// Electron (packaged desktop) Environment Configuration
// The Angular app is served same-origin by the embedded Fastify server on a
// dynamic port, so all API calls must be relative. Auth uses the same mock
// mechanism as local development — there is no cloud Cognito deployment for
// the desktop build and the backend exposes no login endpoint.
export const environment = {
  production: true, // Use production optimizations (minify, no source maps)
  apiUrl: '/api', // Relative URL — resolved against the embedded server origin
  enableLogging: false,
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: false,
  },
  cache: {
    enableServiceWorker: false,
    cacheVersion: '1.0.0-electron',
  },
  security: {
    enableCSP: false, // CSP is injected by the Electron main process instead
    strictSSL: false,
    useSecureCookies: false,
  },
  auth: {
    useMockAuth: true, // Same login mechanism as local development
  },
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  monitoring: {
    enablePerformanceMonitoring: false,
    enableSecurityMonitoring: false,
    logLevel: 'info',
    errorReporting: {
      enabled: false,
      sampleRate: 0.0,
    },
  },
  // Mock cognito config since we're using mock auth
  cognito: {
    region: 'us-east-1',
    userPoolId: 'local-mock-pool',
    userPoolClientId: 'local-mock-client',
    userPoolWebClientId: 'local-mock-client',
    domain: 'localhost',
    scopes: ['openid'],
    redirectSignIn: 'http://localhost/',
    redirectSignOut: 'http://localhost/auth/signout',
  },
};
