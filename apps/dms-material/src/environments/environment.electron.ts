import { localSharedConfig } from './environment-local-shared';

// Electron (packaged desktop) Environment Configuration
// The Angular app is served same-origin by the embedded Fastify server on a
// dynamic port, so all API calls must be relative. Auth uses the same mock
// mechanism as local development — there is no cloud Cognito deployment for
// the desktop build and the backend exposes no login endpoint. CSP is injected
// by the Electron main process instead of via this config. It shares its config
// blocks with the Docker build (see environment-local-shared.ts); only logging,
// the cache version, and the same-origin Cognito redirect URLs differ here.
export const environment = {
  production: true, // Use production optimizations (minify, no source maps)
  apiUrl: '/api', // Relative URL — resolved against the embedded server origin
  enableLogging: false,
  ...localSharedConfig,
  cache: {
    enableServiceWorker: false,
    cacheVersion: '1.0.0-electron',
  },
  // Mock cognito config since we're using mock auth (same-origin redirects)
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
