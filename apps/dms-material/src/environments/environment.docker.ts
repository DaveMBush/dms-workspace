import { localSharedConfig } from './environment-local-shared';

// Docker Environment Configuration
// This environment is used for local containerized deployment. It shares its
// config blocks with the Electron build (see environment-local-shared.ts); only
// logging and the cache version / Cognito redirect URLs differ here.
export const environment = {
  production: true, // Use production optimizations
  apiUrl: '/api', // Use relative URL through nginx proxy
  enableLogging: true,
  ...localSharedConfig,
  cache: {
    enableServiceWorker: false,
    cacheVersion: '1.0.0-docker',
  },
  // Mock cognito config since we're using mock auth (served on :8080 in Docker)
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
