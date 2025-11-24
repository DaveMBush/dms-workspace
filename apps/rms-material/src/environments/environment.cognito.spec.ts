import { cognitoConfigDev } from './cognito-config-dev';
import { cognitoConfigProd } from './cognito-config-prod';
import { cognitoConfigStaging } from './cognito-config-staging';
import { getCognitoConfig } from './get-cognito-config.function';

describe('Cognito Configuration', () => {
  describe('Configuration Validation', () => {
    it('should have valid development configuration structure', () => {
      expect(cognitoConfigDev).toBeDefined();
      expect(cognitoConfigDev.region).toBe('us-east-1');
      expect(cognitoConfigDev.userPoolId).toBeDefined();
      expect(cognitoConfigDev.userPoolWebClientId).toBeDefined();
      expect(cognitoConfigDev.domain).toContain(
        '.auth.us-east-1.amazoncognito.com'
      );
      expect(cognitoConfigDev.redirectSignIn).toBe('http://localhost:4200');
      expect(cognitoConfigDev.redirectSignOut).toBe(
        'http://localhost:4200/auth/signout'
      );
      expect(cognitoConfigDev.scopes).toEqual([
        'openid',
        'email',
        'profile',
        'aws.cognito.signin.user.admin',
      ]);
      if (!cognitoConfigDev.hostedUIUrl.includes('REPLACE_WITH')) {
        expect(cognitoConfigDev.hostedUIUrl).toContain('https://');
      }
      if (!cognitoConfigDev.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigDev.jwtIssuer).toContain(
          'cognito-idp.us-east-1.amazonaws.com'
        );
      }
    });

    it('should have valid production configuration structure', () => {
      expect(cognitoConfigProd).toBeDefined();
      expect(cognitoConfigProd.region).toBe('us-east-1');
      expect(cognitoConfigProd.userPoolId).toBeDefined();
      expect(cognitoConfigProd.userPoolWebClientId).toBeDefined();
      expect(cognitoConfigProd.domain).toContain(
        '.auth.us-east-1.amazoncognito.com'
      );
      expect(cognitoConfigProd.redirectSignIn).toContain('https://');
      expect(cognitoConfigProd.redirectSignOut).toContain('https://');
      expect(cognitoConfigProd.scopes).toEqual([
        'openid',
        'email',
        'profile',
        'aws.cognito.signin.user.admin',
      ]);
      if (!cognitoConfigProd.hostedUIUrl.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.hostedUIUrl).toContain('https://');
      }
      if (!cognitoConfigProd.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.jwtIssuer).toContain(
          'cognito-idp.us-east-1.amazonaws.com'
        );
      }
    });

    it('should have valid staging configuration structure', () => {
      expect(cognitoConfigStaging).toBeDefined();
      expect(cognitoConfigStaging.region).toBe('us-east-1');
      expect(cognitoConfigStaging.userPoolId).toBeDefined();
      expect(cognitoConfigStaging.userPoolWebClientId).toBeDefined();
      expect(cognitoConfigStaging.domain).toContain(
        '.auth.us-east-1.amazoncognito.com'
      );
      expect(cognitoConfigStaging.redirectSignIn).toContain('https://staging.');
      expect(cognitoConfigStaging.redirectSignOut).toContain(
        'https://staging.'
      );
      expect(cognitoConfigStaging.scopes).toEqual([
        'openid',
        'email',
        'profile',
        'aws.cognito.signin.user.admin',
      ]);
      if (!cognitoConfigStaging.hostedUIUrl.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.hostedUIUrl).toContain('https://');
      }
      if (!cognitoConfigStaging.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.jwtIssuer).toContain(
          'cognito-idp.us-east-1.amazonaws.com'
        );
      }
    });
  });

  describe('getCognitoConfig function', () => {
    it('should return dev config when environment is dev', () => {
      const config = getCognitoConfig('dev');
      expect(config).toEqual(cognitoConfigDev);
    });

    it('should return staging config when environment is staging', () => {
      const config = getCognitoConfig('staging');
      expect(config).toEqual(cognitoConfigStaging);
    });

    it('should return prod config when environment is prod', () => {
      const config = getCognitoConfig('prod');
      expect(config).toEqual(cognitoConfigProd);
    });

    it('should throw error for unknown environment', () => {
      expect(() => {
        getCognitoConfig('unknown' as any);
      }).toThrow('Unknown environment: unknown');
    });
  });

  describe('Security Validation', () => {
    it('should use HTTPS for production URLs', () => {
      expect(cognitoConfigProd.redirectSignIn).toMatch(/^https:\/\//);
      expect(cognitoConfigProd.redirectSignOut).toMatch(/^https:\/\//);
      if (!cognitoConfigProd.hostedUIUrl.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.hostedUIUrl).toMatch(/^https:\/\//);
      } else {
        expect(cognitoConfigProd.hostedUIUrl).toContain('REPLACE_WITH');
      }
      if (!cognitoConfigProd.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.jwtIssuer).toMatch(/^https:\/\//);
      } else {
        expect(cognitoConfigProd.jwtIssuer).toContain('REPLACE_WITH');
      }
    });

    it('should use HTTPS for staging URLs', () => {
      expect(cognitoConfigStaging.redirectSignIn).toMatch(/^https:\/\//);
      expect(cognitoConfigStaging.redirectSignOut).toMatch(/^https:\/\//);
      if (!cognitoConfigStaging.hostedUIUrl.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.hostedUIUrl).toMatch(/^https:\/\//);
      } else {
        expect(cognitoConfigStaging.hostedUIUrl).toContain('REPLACE_WITH');
      }
      if (!cognitoConfigStaging.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.jwtIssuer).toMatch(/^https:\/\//);
      } else {
        expect(cognitoConfigStaging.jwtIssuer).toContain('REPLACE_WITH');
      }
    });

    it('should include required OAuth scopes', () => {
      const requiredScopes = ['openid', 'email', 'profile'];

      requiredScopes.forEach((scope) => {
        expect(cognitoConfigDev.scopes).toContain(scope);
        expect(cognitoConfigStaging.scopes).toContain(scope);
        expect(cognitoConfigProd.scopes).toContain(scope);
      });
    });

    it('should include admin scope for single-user app', () => {
      expect(cognitoConfigDev.scopes).toContain(
        'aws.cognito.signin.user.admin'
      );
      expect(cognitoConfigStaging.scopes).toContain(
        'aws.cognito.signin.user.admin'
      );
      expect(cognitoConfigProd.scopes).toContain(
        'aws.cognito.signin.user.admin'
      );
    });

    it('should have consistent region across all configs', () => {
      expect(cognitoConfigDev.region).toBe('us-east-1');
      expect(cognitoConfigStaging.region).toBe('us-east-1');
      expect(cognitoConfigProd.region).toBe('us-east-1');
    });
  });

  describe('URL Validation', () => {
    it('should have valid JWT issuer URLs', () => {
      const jwtIssuerPattern =
        /^https:\/\/cognito-idp\.us-east-1\.amazonaws\.com\/us-east-1_[A-Za-z0-9]+$/;

      // For dev config, allow placeholder or valid pattern
      if (!cognitoConfigDev.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigDev.jwtIssuer).toMatch(jwtIssuerPattern);
      }

      if (!cognitoConfigStaging.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.jwtIssuer).toMatch(jwtIssuerPattern);
      }

      if (!cognitoConfigProd.jwtIssuer.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.jwtIssuer).toMatch(jwtIssuerPattern);
      }
    });

    it('should have valid domain formats', () => {
      const domainPattern = /^[a-z0-9-]+\.auth\.us-east-1\.amazoncognito\.com$/;

      // For dev config, allow placeholder or valid pattern
      if (!cognitoConfigDev.domain.includes('REPLACE_WITH')) {
        expect(cognitoConfigDev.domain).toMatch(domainPattern);
      }

      if (!cognitoConfigStaging.domain.includes('REPLACE_WITH')) {
        expect(cognitoConfigStaging.domain).toMatch(domainPattern);
      }

      if (!cognitoConfigProd.domain.includes('REPLACE_WITH')) {
        expect(cognitoConfigProd.domain).toMatch(domainPattern);
      }
    });

    it('should have consistent callback URL patterns', () => {
      // Dev should use localhost
      expect(cognitoConfigDev.redirectSignIn).toBe('http://localhost:4200');
      expect(cognitoConfigDev.redirectSignOut).toBe(
        'http://localhost:4200/auth/signout'
      );

      // Staging and prod should use HTTPS
      expect(cognitoConfigStaging.redirectSignIn).toMatch(/^https:\/\//);
      expect(cognitoConfigStaging.redirectSignOut).toMatch(
        /^https:\/\/.*\/auth\/signout$/
      );
      expect(cognitoConfigProd.redirectSignIn).toMatch(/^https:\/\//);
      expect(cognitoConfigProd.redirectSignOut).toMatch(
        /^https:\/\/.*\/auth\/signout$/
      );
    });
  });
});
