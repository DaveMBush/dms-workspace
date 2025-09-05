export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  jwksUri: string;
  issuer: string;
}
