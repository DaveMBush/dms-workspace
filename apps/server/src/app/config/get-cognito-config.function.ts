import { awsConfig } from '../../utils/aws-config';
import { CognitoConfig } from '../types/cognito-config.interface';
import { buildCognitoUrls } from './build-cognito-urls.function';
import { createFallbackConfig } from './create-fallback-config.function';

let cachedConfig: CognitoConfig | null = null;

async function buildCognitoConfig(): Promise<CognitoConfig> {
  try {
    // Get config from AWS Parameter Store (or LocalStack)
    const cognitoConfigFromAws = await awsConfig.getCognitoConfig();
    const { jwksUri, issuer } = buildCognitoUrls(
      cognitoConfigFromAws.userPoolId,
      cognitoConfigFromAws.region
    );

    return {
      region: cognitoConfigFromAws.region,
      userPoolId: cognitoConfigFromAws.userPoolId,
      userPoolClientId: cognitoConfigFromAws.userPoolWebClientId,
      jwksUri,
      issuer,
    };
  } catch {
    // Note: Failed to load Cognito config from Parameter Store, falling back to environment variables
    // In production, this would be logged using proper logging infrastructure

    // Fallback to environment variables
    return createFallbackConfig();
  }
}

export async function getCognitoConfig(): Promise<CognitoConfig> {
  if (!cachedConfig) {
    cachedConfig = await buildCognitoConfig();
  }
  return cachedConfig;
}
