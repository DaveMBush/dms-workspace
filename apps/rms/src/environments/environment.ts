import { cognitoConfigDev } from './cognito-config-dev';

// Development Environment Configuration
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  enableLogging: true,
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: false,
  },
  cache: {
    enableServiceWorker: false,
    cacheVersion: '1.0.0-dev',
  },
  security: {
    enableCSP: false,
    strictSSL: false,
  },
  cognito: cognitoConfigDev,
};
