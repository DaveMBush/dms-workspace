import { CognitoConfig } from './cognito-config.interface';
import { cognitoConfigDev } from './cognito-config-dev';
import { cognitoConfigProd } from './cognito-config-prod';
import { cognitoConfigStaging } from './cognito-config-staging';

// Helper function to get the appropriate config based on environment
export function getCognitoConfig(
  environment: 'dev' | 'prod' | 'staging'
): CognitoConfig {
  const configMap = {
    dev: cognitoConfigDev,
    staging: cognitoConfigStaging,
    prod: cognitoConfigProd,
  };

  const config = configMap[environment];
  if (config === undefined) {
    throw new Error(`Unknown environment: ${environment as string}`);
  }

  return config;
}
