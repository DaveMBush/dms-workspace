import { CognitoConfig } from './cognito-config.interface';

const AWS_REGION = 'us-east-1';
const COGNITO_SCOPES = [
  'openid',
  'email',
  'profile',
  'aws.cognito.signin.user.admin',
];

// Production Cognito Configuration
export const cognitoConfigProd: CognitoConfig = {
  region: AWS_REGION,
  userPoolId: 'REPLACE_WITH_PROD_USER_POOL_ID', // From terraform output: cognito_user_pool_id
  userPoolWebClientId: 'REPLACE_WITH_PROD_CLIENT_ID', // From terraform output: cognito_user_pool_client_id
  domain: 'REPLACE_WITH_PROD_DOMAIN.auth.us-east-1.amazoncognito.com', // From terraform output: cognito_user_pool_domain
  redirectSignIn: 'https://your-production-domain.com',
  redirectSignOut: 'https://your-production-domain.com/auth/signout',
  scopes: COGNITO_SCOPES,
  hostedUIUrl: 'REPLACE_WITH_PROD_HOSTED_UI_URL', // From terraform output: cognito_hosted_ui_url
  jwtIssuer: 'REPLACE_WITH_PROD_JWT_ISSUER', // From terraform output: cognito_jwt_issuer
};
