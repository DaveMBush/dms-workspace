// Tests for production environment configuration

import { environment } from './environment.prod';

describe('Production Environment', () => {
  it('should be production environment', () => {
    expect(environment.production).toBe(true);
  });

  it('should have placeholder API URL for replacement during deployment', () => {
    expect(environment.apiUrl).toBe('PLACEHOLDER_API_URL');
  });

  it('should disable logging in production', () => {
    expect(environment.enableLogging).toBe(false);
  });

  it('should enable analytics features in production', () => {
    expect(environment.features.enableAnalytics).toBe(true);
    expect(environment.features.enableErrorReporting).toBe(true);
    expect(environment.features.enablePerformanceMonitoring).toBe(true);
  });

  it('should enable service worker in production', () => {
    expect(environment.cache.enableServiceWorker).toBe(true);
  });

  it('should have production cache version', () => {
    expect(environment.cache.cacheVersion).toBe('1.0.0');
  });

  it('should enable security features in production', () => {
    expect(environment.security.enableCSP).toBe(true);
    expect(environment.security.strictSSL).toBe(true);
  });

  it('should have all required configuration properties', () => {
    const requiredProps = [
      'production',
      'apiUrl',
      'enableLogging',
      'features',
      'cache',
      'security',
    ];

    requiredProps.forEach((prop) => {
      expect(environment).toHaveProperty(prop);
    });
  });

  it('should have all required feature flags', () => {
    const requiredFeatures = [
      'enableAnalytics',
      'enableErrorReporting',
      'enablePerformanceMonitoring',
    ];

    requiredFeatures.forEach((feature) => {
      expect(environment.features).toHaveProperty(feature);
    });
  });

  it('should have all required cache settings', () => {
    const requiredCacheSettings = ['enableServiceWorker', 'cacheVersion'];

    requiredCacheSettings.forEach((setting) => {
      expect(environment.cache).toHaveProperty(setting);
    });
  });

  it('should have all required security settings', () => {
    const requiredSecuritySettings = ['enableCSP', 'strictSSL'];

    requiredSecuritySettings.forEach((setting) => {
      expect(environment.security).toHaveProperty(setting);
    });
  });
});
