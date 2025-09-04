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
} from '@aws-sdk/client-ssm';

export interface DatabaseConfig {
  url: string;
  password?: string;
}

export interface AwsConfigOptions {
  region?: string;
  environment?: string;
}

class AwsConfigManager {
  private ssmClient: SSMClient;
  private environment: string;

  constructor(options: AwsConfigOptions = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'dev';

    this.ssmClient = new SSMClient({
      region: options.region || process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Get database configuration from AWS Parameter Store
   */
  async getDatabaseConfig(): Promise<DatabaseConfig> {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    ) {
      // Use local environment variables in development/test
      return {
        url: process.env.DATABASE_URL || '',
      };
    }

    try {
      const parameterNames = [
        `/rms/${this.environment}/database-url`,
        `/rms/${this.environment}/database-password`,
      ];

      const command = new GetParametersCommand({
        Names: parameterNames,
        WithDecryption: true,
      });

      const response = await this.ssmClient.send(command);

      if (!response.Parameters || response.Parameters.length === 0) {
        throw new Error('No database parameters found in Parameter Store');
      }

      const params = new Map(
        response.Parameters.map((param) => [param.Name, param.Value])
      );

      const databaseUrl = params.get(`/rms/${this.environment}/database-url`);
      const databasePassword = params.get(
        `/rms/${this.environment}/database-password`
      );

      if (!databaseUrl) {
        throw new Error('Database URL not found in Parameter Store');
      }

      return {
        url: databaseUrl,
        password: databasePassword,
      };
    } catch (error) {
      console.error(
        'Failed to fetch database config from AWS Parameter Store:',
        error
      );

      // Fallback to environment variables
      const fallbackUrl = process.env.DATABASE_URL;
      if (fallbackUrl) {
        console.warn('Using fallback DATABASE_URL from environment variables');
        return { url: fallbackUrl };
      }

      throw new Error(
        'Unable to get database configuration from Parameter Store or environment variables'
      );
    }
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
