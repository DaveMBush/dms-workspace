import { AwsConfigManager, validateEnvironmentVariables } from './aws-config';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

// Mock AWS SDK with factory functions to avoid hoisting issues
vi.mock('@aws-sdk/client-ssm', () => {
  const mockSend = vi.fn();
  const mockSSMClient = vi.fn().mockImplementation(() => ({ send: mockSend }));
  const mockGetParametersCommand = vi.fn();

  return {
    SSMClient: mockSSMClient,
    GetParameterCommand: vi.fn(),
    GetParametersCommand: mockGetParametersCommand,
    // Export mocks for test access
    __mockSend: mockSend,
    __mockSSMClient: mockSSMClient,
    __mockGetParametersCommand: mockGetParametersCommand,
  };
});

// Import mocks after vi.mock call
import {
  __mockSend as mockSend,
  __mockSSMClient as mockSSMClient,
  __mockGetParametersCommand as mockGetParametersCommand,
} from '@aws-sdk/client-ssm';

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
        'Missing required environment variables: NODE_ENV'
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
        '⚠️ DATABASE_URL not set, will attempt to fetch from Parameter Store'
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
        // Create instance after setting environment variables
        awsConfig = new AwsConfigManager({ environment: 'production' });
      });

      it('should fetch configuration from Parameter Store in production', async () => {
        mockSend.mockResolvedValue({
          Parameters: [
            {
              Name: '/rms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            {
              Name: '/rms/production/cognito-user-pool-client-id',
              Value: 'prodclientid',
            },
            {
              Name: '/rms/production/cognito-jwt-issuer',
              Value:
                'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_prodpool',
            },
            { Name: '/rms/production/aws-region', Value: 'us-east-1' },
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
            '/rms/production/cognito-user-pool-id',
            '/rms/production/cognito-user-pool-client-id',
            '/rms/production/cognito-jwt-issuer',
            '/rms/production/aws-region',
          ],
          WithDecryption: false,
        });
      });

      it('should throw error when required parameters are missing from Parameter Store', async () => {
        mockSend.mockResolvedValue({
          Parameters: [
            {
              Name: '/rms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            // Missing other required parameters
          ],
        });

        await expect(awsConfig.getCognitoConfig()).rejects.toThrow(
          'Unable to get Cognito configuration from Parameter Store or environment variables'
        );
      });

      it('should fallback to environment variables when Parameter Store fails', async () => {
        mockSend.mockRejectedValue(new Error('Parameter Store error'));

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
              Name: '/rms/production/cognito-user-pool-id',
              Value: 'us-east-1_prodpool',
            },
            {
              Name: '/rms/production/cognito-user-pool-client-id',
              Value: 'prodclientid',
            },
            {
              Name: '/rms/production/cognito-jwt-issuer',
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
        /^https:\/\/cognito-idp\.us-east-1\.amazonaws\.com\/us-east-1_[A-Za-z0-9]+$/
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
      } catch (error: any) {
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('token');
      }

      consoleSpy.mockRestore();
    });
  });
});
