import { CognitoConfig } from './cognito-config.interface';

const AWS_REGION = 'us-east-1';
const LOCAL_ENDPOINT = 'http://localhost:4566';
const COGNITO_SCOPES = [
  'openid',
  'email',
  'profile',
  'aws.cognito.signin.user.admin',
];

// Local Development Cognito Configuration for LocalStack
export const cognitoConfigLocal: CognitoConfig = {
  region: AWS_REGION,
  userPoolId: 'us-east-1_LOCAL123', // Will be updated by LocalStack init script
  userPoolWebClientId: 'local-client-id-123', // Will be updated by LocalStack init script
  domain: 'localhost.auth.us-east-1.amazoncognito.com', // LocalStack domain
  redirectSignIn: 'http://localhost:4200',
  redirectSignOut: 'http://localhost:4200/auth/signout',
  scopes: COGNITO_SCOPES,
  hostedUIUrl: `${LOCAL_ENDPOINT}/cognito-idp/${AWS_REGION}/us-east-1_LOCAL123/hostedUI`, // LocalStack hosted UI
  jwtIssuer: `${LOCAL_ENDPOINT}/cognito-idp/${AWS_REGION}/us-east-1_LOCAL123`, // LocalStack issuer
};
