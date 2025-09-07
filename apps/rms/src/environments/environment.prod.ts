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
  },
  auth: {
    useMockAuth: false, // Production should always use real AWS Cognito
  },
  cognito: cognitoConfigProd,
};
