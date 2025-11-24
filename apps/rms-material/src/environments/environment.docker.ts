// Docker Environment Configuration
// This environment is used for local containerized deployment
export const environment = {
  production: true, // Use production optimizations
  apiUrl: '/api', // Use relative URL through nginx proxy
  enableLogging: true,
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: false,
  },
  cache: {
    enableServiceWorker: false,
    cacheVersion: '1.0.0-docker',
  },
  security: {
    enableCSP: false,
    strictSSL: false,
    useSecureCookies: false,
  },
  auth: {
    useMockAuth: true, // Use mock auth for local development
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
    redirectSignIn: 'http://localhost:8080/',
    redirectSignOut: 'http://localhost:8080/',
  },
};
