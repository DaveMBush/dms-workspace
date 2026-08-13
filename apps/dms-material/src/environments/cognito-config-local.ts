import { CognitoConfig } from './cognito-config.interface';

const awsRegion = 'us-east-1';
const localEndpoint = 'http://localhost:4566';
const cognitoScopes = [
  'openid',
  'email',
  'profile',
  'aws.cognito.signin.user.admin',
];

// Local Development Cognito Configuration for LocalStack
export const cognitoConfigLocal: CognitoConfig = {
  region: awsRegion,
  userPoolId: 'us-east-1_LOCAL123', // Will be updated by LocalStack init script
  userPoolWebClientId: 'local-client-id-123', // Will be updated by LocalStack init script
  domain: 'localhost.auth.us-east-1.amazoncognito.com', // LocalStack domain
  redirectSignIn: 'http://localhost:4200',
  redirectSignOut: 'http://localhost:4200/auth/signout',
  scopes: cognitoScopes,
  hostedUIUrl: `${localEndpoint}/cognito-idp/${awsRegion}/us-east-1_LOCAL123/hostedUI`, // LocalStack hosted UI
  jwtIssuer: `${localEndpoint}/cognito-idp/${awsRegion}/us-east-1_LOCAL123`, // LocalStack issuer
};
