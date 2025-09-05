import { cognitoConfig } from './cognito.config';

export function validateCognitoConfig(): void {
  const missing: string[] = [];

  if (cognitoConfig.userPoolId.length === 0) {
    missing.push('COGNITO_USER_POOL_ID');
  }

  if (cognitoConfig.userPoolClientId.length === 0) {
    missing.push('COGNITO_USER_POOL_CLIENT_ID');
  }

  if (cognitoConfig.region.length === 0) {
    missing.push('AWS_REGION');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cognito configuration environment variables: ${missing.join(
        ', '
      )}`
    );
  }
}
