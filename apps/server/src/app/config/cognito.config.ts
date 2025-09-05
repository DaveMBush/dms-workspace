import { CognitoConfig } from '../types/cognito-config.interface';

const awsRegion = process.env['AWS_REGION'] ?? 'us-east-1';
const userPoolId = process.env['COGNITO_USER_POOL_ID'] ?? '';
const userPoolClientId = process.env['COGNITO_USER_POOL_CLIENT_ID'] ?? '';

export const cognitoConfig: CognitoConfig = {
  region: awsRegion,
  userPoolId,
  userPoolClientId,
  jwksUri: `https://cognito-idp.${awsRegion}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  issuer: `https://cognito-idp.${awsRegion}.amazonaws.com/${userPoolId}`,
};
