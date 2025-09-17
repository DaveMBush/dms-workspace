import { CognitoConfig } from '../types/cognito-config.interface';
import { getCognitoConfig } from './get-cognito-config.function';

function validateConfigFields(config: CognitoConfig): string[] {
  const requiredFields = [
    { key: 'userPoolId', value: config.userPoolId },
    { key: 'userPoolClientId', value: config.userPoolClientId },
    { key: 'region', value: config.region },
    { key: 'jwksUri', value: config.jwksUri },
    { key: 'issuer', value: config.issuer },
  ];

  function isFieldEmpty(field: { key: string; value: string }): boolean {
    return !field.value || field.value.length === 0;
  }

  function extractFieldKey(field: { key: string; value: string }): string {
    return field.key;
  }

  return requiredFields.filter(isFieldEmpty).map(extractFieldKey);
}

export async function validateCognitoConfigAsync(): Promise<CognitoConfig> {
  const config = await getCognitoConfig();
  const missing = validateConfigFields(config);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cognito configuration: ${missing.join(', ')}`
    );
  }

  return config;
}
