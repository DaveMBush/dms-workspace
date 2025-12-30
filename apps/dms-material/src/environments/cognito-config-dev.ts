import { CognitoConfig } from './cognito-config.interface';

const AWS_REGION = 'us-east-1';
const COGNITO_SCOPES = [
  'openid',
  'email',
  'profile',
  'aws.cognito.signin.user.admin',
];

// Development Cognito Configuration
export const cognitoConfigDev: CognitoConfig = {
  region: AWS_REGION,
  userPoolId: 'REPLACE_WITH_DEV_USER_POOL_ID', // From terraform output: cognito_user_pool_id
  userPoolWebClientId: 'REPLACE_WITH_DEV_CLIENT_ID', // From terraform output: cognito_user_pool_client_id
  domain: 'REPLACE_WITH_DEV_DOMAIN.auth.us-east-1.amazoncognito.com', // From terraform output: cognito_user_pool_domain
  redirectSignIn: 'http://localhost:4200',
  redirectSignOut: 'http://localhost:4200/auth/signout',
  scopes: COGNITO_SCOPES,
  hostedUIUrl: 'REPLACE_WITH_DEV_HOSTED_UI_URL', // From terraform output: cognito_hosted_ui_url
  jwtIssuer: 'REPLACE_WITH_DEV_JWT_ISSUER', // From terraform output: cognito_jwt_issuer
};
