import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('validateCognitoConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should validate cognito configuration', async () => {
    // Mock the cognito config module
    vi.doMock('./cognito.config', () => ({
      cognitoConfig: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_TestPool',
        userPoolClientId: 'test-client-id',
        jwksUri: 'https://test.jwks.uri',
        issuer: 'https://test.issuer',
      },
    }));

    const { validateCognitoConfig } = await import(
      './cognito-validation.function'
    );
    expect(() => validateCognitoConfig()).not.toThrow();
  });

  it('should throw error for missing user pool ID', async () => {
    vi.doMock('./cognito.config', () => ({
      cognitoConfig: {
        region: 'us-east-1',
        userPoolId: '', // Empty user pool ID
        userPoolClientId: 'test-client-id',
        jwksUri: 'https://test.jwks.uri',
        issuer: 'https://test.issuer',
      },
    }));

    const { validateCognitoConfig } = await import(
      './cognito-validation.function'
    );
    expect(() => validateCognitoConfig()).toThrow(
      'Missing required Cognito configuration environment variables: COGNITO_USER_POOL_ID'
    );
  });

  it('should throw error for missing client ID', async () => {
    vi.doMock('./cognito.config', () => ({
      cognitoConfig: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_TestPool',
        userPoolClientId: '', // Empty client ID
        jwksUri: 'https://test.jwks.uri',
        issuer: 'https://test.issuer',
      },
    }));

    const { validateCognitoConfig } = await import(
      './cognito-validation.function'
    );
    expect(() => validateCognitoConfig()).toThrow(
      'Missing required Cognito configuration environment variables: COGNITO_USER_POOL_CLIENT_ID'
    );
  });

  it('should throw error for missing region', async () => {
    vi.doMock('./cognito.config', () => ({
      cognitoConfig: {
        region: '', // Empty region
        userPoolId: 'us-east-1_TestPool',
        userPoolClientId: 'test-client-id',
        jwksUri: 'https://test.jwks.uri',
        issuer: 'https://test.issuer',
      },
    }));

    const { validateCognitoConfig } = await import(
      './cognito-validation.function'
    );
    expect(() => validateCognitoConfig()).toThrow(
      'Missing required Cognito configuration environment variables: AWS_REGION'
    );
  });

  it('should throw error for multiple missing variables', async () => {
    vi.doMock('./cognito.config', () => ({
      cognitoConfig: {
        region: '',
        userPoolId: '',
        userPoolClientId: 'test-client-id',
        jwksUri: 'https://test.jwks.uri',
        issuer: 'https://test.issuer',
      },
    }));

    const { validateCognitoConfig } = await import(
      './cognito-validation.function'
    );
    expect(() => validateCognitoConfig()).toThrow(
      'Missing required Cognito configuration environment variables: COGNITO_USER_POOL_ID, AWS_REGION'
    );
  });
});
