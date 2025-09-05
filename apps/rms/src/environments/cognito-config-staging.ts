import { CognitoConfig } from './cognito-config.interface';

const AWS_REGION = 'us-east-1';
const COGNITO_SCOPES = [
  'openid',
  'email',
  'profile',
  'aws.cognito.signin.user.admin',
];

// Staging Cognito Configuration
export const cognitoConfigStaging: CognitoConfig = {
  region: AWS_REGION,
  userPoolId: 'REPLACE_WITH_STAGING_USER_POOL_ID', // From terraform output: cognito_user_pool_id
  userPoolWebClientId: 'REPLACE_WITH_STAGING_CLIENT_ID', // From terraform output: cognito_user_pool_client_id
  domain: 'REPLACE_WITH_STAGING_DOMAIN.auth.us-east-1.amazoncognito.com', // From terraform output: cognito_user_pool_domain
  redirectSignIn: 'https://staging.your-domain.com',
  redirectSignOut: 'https://staging.your-domain.com/auth/signout',
  scopes: COGNITO_SCOPES,
  hostedUIUrl: 'REPLACE_WITH_STAGING_HOSTED_UI_URL', // From terraform output: cognito_hosted_ui_url
  jwtIssuer: 'REPLACE_WITH_STAGING_JWT_ISSUER', // From terraform output: cognito_jwt_issuer
};
