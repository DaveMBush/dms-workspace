import { CognitoConfig } from '../types/cognito-config.interface';
import { buildCognitoUrls } from './build-cognito-urls.function';

export function createFallbackConfig(): CognitoConfig {
  const awsRegion = process.env['AWS_REGION'] ?? 'us-east-1';
  const userPoolId = process.env['COGNITO_USER_POOL_ID'] ?? '';
  const userPoolClientId = process.env['COGNITO_USER_POOL_CLIENT_ID'] ?? '';
  const { jwksUri, issuer } = buildCognitoUrls(userPoolId, awsRegion);

  return {
    region: awsRegion,
    userPoolId,
    userPoolClientId,
    jwksUri,
    issuer,
  };
}
