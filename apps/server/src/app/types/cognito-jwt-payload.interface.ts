export interface CognitoJwtPayload {
  sub: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- AWS Cognito property names use colon notation
  'cognito:username': string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- AWS Cognito property names use colon notation
  'cognito:groups'?: string[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
