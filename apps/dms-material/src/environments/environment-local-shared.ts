// Shared configuration blocks for local, non-cloud deployments (Docker and
// Electron). Both serve the Angular app same-origin with a relative API URL and
// use mock auth — there is no cloud Cognito deployment for these builds. Each
// environment spreads this object so only its distinct values stay inline.

export const localSharedConfig = {
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: false,
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
};
