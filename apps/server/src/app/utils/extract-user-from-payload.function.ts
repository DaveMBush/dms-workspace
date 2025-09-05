import { AuthenticatedUser, CognitoJwtPayload } from '../types/auth.types';

export function extractUserFromPayload(
  payload: CognitoJwtPayload
): AuthenticatedUser {
  return {
    sub: payload.sub,
    email: payload.email,
    username: payload['cognito:username'],
    groups: payload['cognito:groups'] ?? [],
  };
}
