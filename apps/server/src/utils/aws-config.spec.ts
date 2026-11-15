/* eslint-disable vitest/no-conditional-expect -- Pre-existing: catch-block assertions verify error properties */
/* eslint-disable vitest/no-disabled-tests -- red-phase (Story 19.2) contract tests; intentionally skipped until the single-classifier consolidation lands */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AwsConfigManager, validateEnvironmentVariables } from './aws-config';

// Story 19.1 (red phase): the assertions in the "Single Environment Classifier"
// block below are RED against current production code — aws-config.ts exposes
// two divergent NODE_ENV classifiers (`isDevEnvironment()` and `isDevOrTest()`)
// instead of one. They stay `it.skip` per Story 19.1 AC #4/#5 so the suite is
// green until then; Story 19.2's first task removes the skip markers, confirms
// they fail, then consolidates until they pass. No production code changes in
// this story (see scripts/check-no-skipped-tests.sh for the exemption rule).

// Mock AWS SDK with factory functions to avoid hoisting issues
const { mockSend, mockSSMClient, mockGetParametersCommand } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockSSMClient = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
  ) {
    this.send = mockSend;
  });
  const mockGetParametersCommand = vi.fn();

  return { mockSend, mockSSMClient, mockGetParametersCommand };
});

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: mockSSMClient,
  GetParameterCommand: vi.fn(),
  GetParametersCommand: mockGetParametersCommand,
}));

describe('AWS Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let awsConfig: AwsConfigManager;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    mockSend.mockClear();
    mockSSMClient.mockClear();
    mockGetParametersCommand.mockClear();
    // Create fresh instance for each test to ensure environment is correct
    awsConfig = new AwsConfigManager();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should validate required environment variables', () => {
      process.env.NODE_ENV = 'development';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error when NODE_ENV is missing', () => {
      delete process.env.NODE_ENV;

      expect(() => validateEnvironmentVariables()).toThrow(
        'Missing required environment variables: NODE_ENV',
      );
    });

    it('should warn when DATABASE_URL is missing in non-test environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Mock implementation for test
      });

      validateEnvironmentVariables();

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ DATABASE_URL not set, will attempt to fetch from Parameter Store',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cognito Configuration', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.AWS_REGION = 'us-east-1';
        process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
        process.env.COGNITO_USER_POOL_CLIENT_ID = 'testclientid';
        process.env.COGNITO_JWT_ISSUER =
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool';
      });

      it('should return configuration from environment variables in development', async () => {
        const config = await awsConfig.getCognitoConfig();

        expect(config).toEqual({
          region: 'us-east-1',
          userPoolId: 'us-east-1_testpool',
          userPoolWebClientId: 'testclientid',
          jwtIssuer:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool',
        });
      });

      it('should use defaults when environment variables are missing', async () => {
        delete process.env.COGNITO_USER_POOL_ID;
        delete process.env.COGNITO_USER_POOL_CLIENT_ID;
        delete process.env.COGNITO_JWT_ISSUER;

        const config = await awsConfig.getCognitoConfig();

        expect(config.region).toBe('us-east-1');
        expect(config.userPoolId).toBe('REPLACE_WITH_DEV_USER_POOL_ID');
        expect(config.userPoolWebClientId).toBe('REPLACE_WITH_DEV_CLIENT_ID');
        expect(config.jwtIssuer).toBe('REPLACE_WITH_DEV_JWT_ISSUER');
      });

      it('should default to us-east-1 when AWS_REGION is not set', async () => {
        delete process.env.AWS_REGION;

        const config = await awsConfig.getCognitoConfig();

        expect(config.region).toBe('us-east-1');
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.AWS_REGION = 'us-east-1';
        process.env.COGNITO_USER_POOL_ID = 'us-east-1_testpool';
        process.env.COGNITO_USER_POOL_CLIENT_ID = 'testclientid';
        process.env.COGNITO_JWT_ISSUER =
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool';
      });

      it('should return configuration from environment variables in test environment', async () => {
        const config = await awsConfig.getCognitoConfig();

        expect(config).toEqual({
          region: 'us-east-1',
          userPoolId: 'us-east-1_testpool',
          userPoolWebClientId: 'testclientid',
          jwtIssuer:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_testpool',
        });
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.AWS_REGION = 'us-east-1';
        // Clear local environment flags to ensure production behavior
        delete process.env.USE_LOCAL_SERVICES;
        delete process.env.AWS_ENDPOINT_URL;
        // Create instance after setting environment variables
        awsConfig = new AwsConfigManager({ environment: 'production' });
      });

      it('should fetch configuration from Parameter Store in production', async () => {
        mockSend.mockResolvedValue({
          Parameters: [
            {
              Name: '/dms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            {
              Name: '/dms/production/cognito-user-pool-client-id',
              Value: 'prodclientid',
            },
            {
              Name: '/dms/production/cognito-jwt-issuer',
              Value:
                'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_prodpool',
            },
            { Name: '/dms/production/aws-region', Value: 'us-east-1' },
          ],
        });

        const config = await awsConfig.getCognitoConfig();

        expect(config).toEqual({
          region: 'us-east-1',
          userPoolId: 'us-east-1_prodpool',
          userPoolWebClientId: 'prodclientid',
          jwtIssuer:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_prodpool',
        });

        expect(mockGetParametersCommand).toHaveBeenCalledWith({
          Names: [
            '/dms/production/cognito-user-pool-id',
            '/dms/production/cognito-user-pool-client-id',
            '/dms/production/cognito-jwt-issuer',
            '/dms/production/aws-region',
          ],
          WithDecryption: false,
        });
      });

      it('should throw error when required parameters are missing from Parameter Store', async () => {
        mockSend.mockResolvedValue({
          Parameters: [
            {
              Name: '/dms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            // Missing other required parameters
          ],
        });

        // Clear environment variables to ensure no fallback
        delete process.env.COGNITO_USER_POOL_ID;
        delete process.env.COGNITO_USER_POOL_CLIENT_ID;
        delete process.env.COGNITO_JWT_ISSUER;

        await expect(awsConfig.getCognitoConfig()).rejects.toThrow(
          'Unable to get Cognito configuration from Parameter Store or environment variables',
        );
      });

      it('should fallback to environment variables when Parameter Store fails', async () => {
        mockSend.mockRejectedValue(new Error('Parameter Store error'));

        // Clear any existing environment variables first
        delete process.env.COGNITO_USER_POOL_ID;
        delete process.env.COGNITO_USER_POOL_CLIENT_ID;
        delete process.env.COGNITO_JWT_ISSUER;

        process.env.COGNITO_USER_POOL_ID = 'us-east-1_fallback';
        process.env.COGNITO_USER_POOL_CLIENT_ID = 'fallbackclient';
        process.env.COGNITO_JWT_ISSUER =
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_fallback';

        const config = await awsConfig.getCognitoConfig();

        expect(config).toEqual({
          region: 'us-east-1',
          userPoolId: 'us-east-1_fallback',
          userPoolWebClientId: 'fallbackclient',
          jwtIssuer:
            'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_fallback',
        });
      });

      it('should default region to us-east-1 when not provided in Parameter Store', async () => {
        mockSend.mockResolvedValue({
          Parameters: [
            {
              Name: '/dms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            {
              Name: '/dms/production/cognito-user-pool-client-id',
              Value: 'prodclientid',
            },
            {
              Name: '/dms/production/cognito-jwt-issuer',
              Value:
                'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_prodpool',
            },
            // No aws-region parameter
          ],
        });

        const config = await awsConfig.getCognitoConfig();

        expect(config.region).toBe('us-east-1');
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate JWT issuer format', async () => {
      process.env.NODE_ENV = 'test';
      process.env.COGNITO_JWT_ISSUER =
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123';

      const config = await awsConfig.getCognitoConfig();

      expect(config.jwtIssuer).toMatch(
        /^https:\/\/cognito-idp\.us-east-1\.amazonaws\.com\/us-east-1_[A-Za-z0-9]+$/,
      );
    });

    it('should validate user pool ID format', async () => {
      process.env.NODE_ENV = 'test';
      process.env.COGNITO_USER_POOL_ID = 'us-east-1_ABC123';

      const config = await awsConfig.getCognitoConfig();

      expect(config.userPoolId).toMatch(/^us-east-1_[A-Za-z0-9]+$/);
    });

    it('should ensure client ID is not empty', async () => {
      process.env.NODE_ENV = 'test';
      process.env.COGNITO_USER_POOL_CLIENT_ID = 'validclientid123';

      const config = await awsConfig.getCognitoConfig();

      expect(config.userPoolWebClientId).toBeTruthy();
      expect(config.userPoolWebClientId.length).toBeGreaterThan(0);
    });
  });

  describe('Security Considerations', () => {
    it('should use HTTPS for JWT issuer', async () => {
      process.env.NODE_ENV = 'test';
      process.env.COGNITO_JWT_ISSUER =
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123';

      const config = await awsConfig.getCognitoConfig();

      expect(config.jwtIssuer).toMatch(/^https:\/\//);
    });

    it('should use AWS Cognito domain for JWT issuer', async () => {
      process.env.NODE_ENV = 'test';
      process.env.COGNITO_JWT_ISSUER =
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123';

      const config = await awsConfig.getCognitoConfig();

      expect(config.jwtIssuer).toContain('amazonaws.com');
    });

    it('should not expose sensitive data in error messages', async () => {
      process.env.NODE_ENV = 'production';

      mockSend.mockRejectedValue(new Error('Access denied'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation for test
      });

      try {
        await awsConfig.getCognitoConfig();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain('secret');
        expect(message).not.toContain('password');
        expect(message).not.toContain('token');
      }

      consoleSpy.mockRestore();
    });
  });

  // Story 19.1 Task 1 (AC #1): single-classifier contract. RED against current
  // code — aws-config.ts defines two divergent NODE_ENV classifiers,
  // `isDevEnvironment()` and `isDevOrTest()`, used by the two call sites in
  // getDatabaseConfig() and getCognitoConfig(). Skipped per AC #4; Story 19.2
  // removes the skip markers, confirms red, then consolidates to one classifier.
  describe('Single Environment Classifier (Story 19.1 red phase)', () => {
    const source = readFileSync(join(__dirname, 'aws-config.ts'), 'utf-8');

    it.skip('should define exactly one NODE_ENV environment classifier', () => {
      // A "classifier" is a method whose body branches on process.env.NODE_ENV.
      // Today both `isDevEnvironment()` and `isDevOrTest()` match, so this fails.
      const classifiers =
        source.match(
          /private\s+\w+\s*\(\s*\)\s*:\s*boolean\s*\{[^}]*process\.env\.NODE_ENV[^}]*\}/gs,
        ) ?? [];

      expect(classifiers).toHaveLength(1);
    });

    it.skip('should route both former call sites through the single classifier', () => {
      // getDatabaseConfig() calls isDevEnvironment(); getCognitoConfig() calls
      // isDevOrTest(). After consolidation, neither name may remain and every
      // NODE_ENV branch must go through the one surviving classifier.
      expect(source).not.toMatch(/isDevEnvironment\s*\(\s*\)/);
      expect(source).not.toMatch(/isDevOrTest\s*\(\s*\)/);

      const classifiers =
        source.match(
          /private\s+\w+\s*\(\s*\)\s*:\s*boolean\s*\{[^}]*process\.env\.NODE_ENV[^}]*\}/gs,
        ) ?? [];
      expect(classifiers).toHaveLength(1);

      // Both call sites must reference the single classifier.
      const [classifier] = classifiers;
      const name = /private\s+(\w+)\s*\(\s*\)/.exec(classifier)?.[1];
      expect(name).toBeDefined();
      const callSiteCount = [
        ...source.matchAll(new RegExp(`this\\.${name}\\(\\)`, 'g')),
      ].length;
      expect(callSiteCount).toBeGreaterThanOrEqual(2);
    });

    // Story 19.1 Task 2 (AC #2): per-NODE_ENV correctness of the single
    // classifier. RED against current code — `isDevEnvironment()` and
    // `isDevOrTest()` disagree on NODE_ENV=local, so no single method can
    // satisfy all four cases until Story 19.2 consolidates them. Skipped per
    // AC #4; unskipping in Story 19.2 must fail first, then pass after the
    // consolidation. The classifier is located dynamically (same definition as
    // Task 1: a method whose body branches on process.env.NODE_ENV) so these
    // assertions survive whichever name survives the consolidation.
    // Invokes the single surviving private classifier by name (private in TS,
    // so accessed via a function-typed record cast).
    const invokeClassifier = (): boolean => {
      const classifiers =
        source.match(
          /private\s+\w+\s*\(\s*\)\s*:\s*boolean\s*\{[^}]*process\.env\.NODE_ENV[^}]*\}/gs,
        ) ?? [];
      expect(classifiers).toHaveLength(1);
      const name = /private\s+(\w+)\s*\(\s*\)/.exec(classifiers[0])![1];
      return (awsConfig as unknown as Record<string, () => boolean>)[name]();
    };

    // Skipped per AC #4: red-phase contract assertion for Story 19.2, which removes the skip marker and confirms this fails against current code before consolidating the classifiers until it passes.
    it.skip('should classify NODE_ENV=development as a dev environment', () => {
      process.env.NODE_ENV = 'development';
      expect(invokeClassifier()).toBe(true);
    });

    // Skipped per AC #4: red-phase contract assertion for Story 19.2, which removes the skip marker and confirms this fails against current code before consolidating the classifiers until it passes.
    it.skip('should classify NODE_ENV=test as a dev environment', () => {
      process.env.NODE_ENV = 'test';
      expect(invokeClassifier()).toBe(true);
    });

    it.skip('should classify NODE_ENV=local as a dev environment', () => {
      // Judgment call: the two current classifiers disagree on `local`
      // (isDevEnvironment() → true; isDevOrTest() → false when LocalStack
      // flags are set). The contract encoded here is that local behaves like
      // development — env-var based config, not Parameter Store. If Story 19.2
      // decides otherwise, flip this expectation and the comment together.
      process.env.NODE_ENV = 'local';
      expect(invokeClassifier()).toBe(true);
    });

    // Skipped per AC #4: red-phase contract assertion for Story 19.2, which removes the skip marker and confirms this fails against current code before consolidating the classifiers until it passes.
    it.skip('should classify NODE_ENV=production as a production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(invokeClassifier()).toBe(false);
    });

    // Story 19.1 Task 3 (AC #3): no broken-config fallback from missing DATABASE_URL.
    // RED against current code — getLocalDatabaseConfig() returns { url: '' } when
    // DATABASE_URL is absent in dev/test/local environments, silently producing a
    // broken config that Prisma/ORM cannot use. The contract: the code must either
    // throw (explicit failure) or return a clearly-named default; it must never
    // resolve with an empty URL string. Skipped per AC #4; Story 19.2 removes the
    // skip marker, confirms this fails against current code, then fixes
    // getLocalDatabaseConfig() to satisfy the contract.
    it.skip('should not silently fall back to an empty database URL when DATABASE_URL is absent', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;

      const result = await awsConfig.getDatabaseConfig().catch((e) => e);

      if (result instanceof Error) {
        // Throwing is acceptable per the contract — explicit failure over silent broken config.
        return;
      }

      expect(result.url).not.toBe('');
    });
  });
});
