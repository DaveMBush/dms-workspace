/**
 * AWS Configuration Utility
 *
 * This utility handles fetching configuration from AWS Systems Manager
 * Parameter Store for production environments.
 */

import {
  GetParameterCommand,
  GetParametersCommand,
  SSMClient,
  type SSMClientConfig,
} from '@aws-sdk/client-ssm';

export interface DatabaseConfig {
  url: string;
  password?: string;
}

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
  jwtIssuer: string;
}

export interface AwsConfigOptions {
  region?: string;
  environment?: string;
}

export class AwsConfigManager {
  private ssmClient: SSMClient;
  private environment: string;

  constructor(options: AwsConfigOptions = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'dev';
    this.ssmClient = new SSMClient(this.createSSMConfig(options));
  }

  /**
   * Get database configuration from AWS Parameter Store
   */
  async getDatabaseConfig(): Promise<DatabaseConfig> {
    return this.isDevEnvironment()
      ? this.getLocalDatabaseConfig()
      : this.getParameterStoreDatabaseConfig();
  }

  /**
   * Get a single parameter from Parameter Store
   */
  async getParameter(
    name: string,
    encrypted: boolean = true
  ): Promise<string | undefined> {
    try {
      const command = new GetParameterCommand({
        Name: name,
        WithDecryption: encrypted,
      });

      const response = await this.ssmClient.send(command);
      return response.Parameter?.Value;
    } catch (error) {
      console.error(`Failed to get parameter ${name}:`, error);
      return undefined;
    }
  }

  /**
   * Get multiple parameters from Parameter Store
   */
  async getParameters(
    names: string[],
    encrypted: boolean = true
  ): Promise<Map<string, string>> {
    try {
      const command = new GetParametersCommand({
        Names: names,
        WithDecryption: encrypted,
      });

      const response = await this.ssmClient.send(command);

      const paramMap = new Map<string, string>();

      if (response.Parameters) {
        for (const param of response.Parameters) {
          if (param.Name && param.Value) {
            paramMap.set(param.Name, param.Value);
          }
        }
      }

      return paramMap;
    } catch (error) {
      console.error('Failed to get parameters:', error);
      return new Map();
    }
  }

  /**
   * Get Cognito configuration from AWS Parameter Store or environment variables
   */
  async getCognitoConfig(): Promise<CognitoConfig> {
    return this.isDevOrTest()
      ? this.getDevCognitoConfig()
      : this.getProdCognitoConfig();
  }

  private createSSMConfig(options: AwsConfigOptions): SSMClientConfig {
    const baseConfig: SSMClientConfig = {
      region: options.region || process.env.AWS_REGION || 'us-east-1',
    };

    return this.isLocalEnvironment()
      ? this.addLocalStackConfig(baseConfig)
      : baseConfig;
  }

  private addLocalStackConfig(config: SSMClientConfig): SSMClientConfig {
    return {
      ...config,
      endpoint:
        process.env.AWS_SSM_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL ||
        'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    };
  }

  /**
   * Check if running in local containerized environment with LocalStack
   */
  private isLocalEnvironment(): boolean {
    return (
      process.env.USE_LOCAL_SERVICES === 'true' ||
      Boolean(process.env.AWS_ENDPOINT_URL)
    );
  }

  private isDevEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'local'
    );
  }

  private getLocalDatabaseConfig(): DatabaseConfig {
    return {
      url: process.env.DATABASE_URL || '',
    };
  }

  private async getParameterStoreDatabaseConfig(): Promise<DatabaseConfig> {
    try {
      const env = this.isLocalEnvironment() ? 'local' : this.environment;
      const params = await this.getDatabaseParameters(env);
      return this.buildDatabaseConfig(params, env);
    } catch (error) {
      console.error(
        'Failed to fetch database config from AWS Parameter Store:',
        error
      );
      return this.getFallbackDatabaseConfig();
    }
  }

  private async getDatabaseParameters(
    env: string
  ): Promise<Map<string, string>> {
    const parameterNames = [
      `/rms/${env}/database-url`,
      `/rms/${env}/database-password`,
    ];

    const command = new GetParametersCommand({
      Names: parameterNames,
      WithDecryption: true,
    });

    const response = await this.ssmClient.send(command);

    if (!response.Parameters || response.Parameters.length === 0) {
      throw new Error('No database parameters found in Parameter Store');
    }

    return new Map(
      response.Parameters.map((param) => [param.Name!, param.Value!])
    );
  }

  private buildDatabaseConfig(
    params: Map<string, string>,
    env: string
  ): DatabaseConfig {
    const databaseUrl = params.get(`/rms/${env}/database-url`);
    const databasePassword = params.get(`/rms/${env}/database-password`);

    if (!databaseUrl) {
      throw new Error('Database URL not found in Parameter Store');
    }

    return {
      url: databaseUrl,
      password: databasePassword,
    };
  }

  private getFallbackDatabaseConfig(): DatabaseConfig {
    const fallbackUrl = process.env.DATABASE_URL;
    if (fallbackUrl) {
      console.warn('Using fallback DATABASE_URL from environment variables');
      return { url: fallbackUrl };
    }

    throw new Error(
      'Unable to get database configuration from Parameter Store or environment variables'
    );
  }

  /**
   * Check if environment is development, test, or local development
   */
  private isDevOrTest(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      (process.env.NODE_ENV === 'local' && !this.isLocalEnvironment())
    );
  }

  /**
   * Get Cognito configuration for development/test environment
   */
  private getDevCognitoConfig(): CognitoConfig {
    return {
      region: process.env.AWS_REGION || 'us-east-1',
      userPoolId:
        process.env.COGNITO_USER_POOL_ID || 'REPLACE_WITH_DEV_USER_POOL_ID',
      userPoolWebClientId:
        process.env.COGNITO_USER_POOL_CLIENT_ID || 'REPLACE_WITH_DEV_CLIENT_ID',
      jwtIssuer:
        process.env.COGNITO_JWT_ISSUER || 'REPLACE_WITH_DEV_JWT_ISSUER',
    };
  }

  /**
   * Get Cognito configuration for production environment
   */
  private async getProdCognitoConfig(): Promise<CognitoConfig> {
    try {
      const params = await this.getCognitoParametersFromStore();
      return this.buildCognitoConfigFromParams(params);
    } catch (error) {
      console.error(
        'Failed to fetch Cognito config from AWS Parameter Store:',
        error
      );
      return this.getFallbackCognitoConfig();
    }
  }

  /**
   * Get Cognito parameters from Parameter Store
   */
  private async getCognitoParametersFromStore(): Promise<Map<string, string>> {
    // Use 'local' environment for LocalStack parameters
    const env = this.isLocalEnvironment() ? 'local' : this.environment;
    const parameterNames = [
      `/rms/${env}/cognito-user-pool-id`,
      `/rms/${env}/cognito-user-pool-client-id`,
      `/rms/${env}/cognito-jwt-issuer`,
      `/rms/${env}/aws-region`,
    ];

    return this.getParameters(parameterNames, false);
  }

  /**
   * Build Cognito config from Parameter Store parameters
   */
  private buildCognitoConfigFromParams(
    params: Map<string, string>
  ): CognitoConfig {
    // Use 'local' environment for LocalStack parameters
    const env = this.isLocalEnvironment() ? 'local' : this.environment;
    const region = params.get(`/rms/${env}/aws-region`) || 'us-east-1';
    const userPoolId = params.get(`/rms/${env}/cognito-user-pool-id`);
    const userPoolWebClientId = params.get(
      `/rms/${env}/cognito-user-pool-client-id`
    );
    const jwtIssuer = params.get(`/rms/${env}/cognito-jwt-issuer`);

    if (!userPoolId || !userPoolWebClientId || !jwtIssuer) {
      throw new Error('Missing required Cognito parameters in Parameter Store');
    }

    return {
      region,
      userPoolId,
      userPoolWebClientId,
      jwtIssuer,
    };
  }

  /**
   * Get fallback Cognito configuration from environment variables
   */
  private getFallbackCognitoConfig(): CognitoConfig {
    const fallbackUserPoolId = process.env.COGNITO_USER_POOL_ID;
    const fallbackClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
    const fallbackJwtIssuer = process.env.COGNITO_JWT_ISSUER;

    if (fallbackUserPoolId && fallbackClientId && fallbackJwtIssuer) {
      console.warn(
        'Using fallback Cognito configuration from environment variables'
      );
      return {
        region: process.env.AWS_REGION || 'us-east-1',
        userPoolId: fallbackUserPoolId,
        userPoolWebClientId: fallbackClientId,
        jwtIssuer: fallbackJwtIssuer,
      };
    }

    throw new Error(
      'Unable to get Cognito configuration from Parameter Store or environment variables'
    );
  }
}

// Export singleton instance
export const awsConfig = new AwsConfigManager();

/**
 * Initialize database URL from AWS Parameter Store or environment variables
 */
export async function initializeDatabaseUrl(): Promise<string> {
  try {
    const dbConfig = await awsConfig.getDatabaseConfig();

    if (!dbConfig.url) {
      throw new Error('Database URL is empty');
    }

    // Set the DATABASE_URL environment variable for Prisma
    process.env.DATABASE_URL = dbConfig.url;

    console.log('✅ Database configuration loaded successfully');
    return dbConfig.url;
  } catch (error) {
    console.error('❌ Failed to initialize database URL:', error);
    throw error;
  }
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironmentVariables(): void {
  const required = ['NODE_ENV'];
  const missing = required.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate database URL based on environment
  if (process.env.NODE_ENV !== 'test' && !process.env.DATABASE_URL) {
    console.warn(
      '⚠️ DATABASE_URL not set, will attempt to fetch from Parameter Store'
    );
  }

  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
}
