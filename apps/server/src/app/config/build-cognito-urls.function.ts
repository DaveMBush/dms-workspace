import { isLocalEnvironment } from './is-local-environment.function';

export function buildCognitoUrls(
  userPoolId: string,
  region: string
): { jwksUri: string; issuer: string } {
  if (isLocalEnvironment()) {
    const localEndpoint =
      process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
    return {
      jwksUri: `${localEndpoint}/cognito-idp/${region}/${userPoolId}/.well-known/jwks.json`,
      issuer: `${localEndpoint}/cognito-idp/${region}/${userPoolId}`,
    };
  }

  return {
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  };
}
