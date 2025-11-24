// AWS Cognito Configuration Interface for RMS Application
export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
  domain: string;
  redirectSignIn: string;
  redirectSignOut: string;
  scopes: string[];
  hostedUIUrl: string;
  jwtIssuer: string;
}
