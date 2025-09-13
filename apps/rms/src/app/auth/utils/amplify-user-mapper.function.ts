import { AuthUser } from '../auth.types';

/**
 * Map Amplify user object to our AuthUser interface
 */
export function mapAmplifyUserToAuthUser(amplifyUser: unknown): AuthUser {
  const user = amplifyUser as {
    username?: string;
    userId?: string;
    signInDetails?: { loginId?: string };
  };
  const email = user.signInDetails?.loginId ?? user.username ?? '';
  return {
    username: user.username ?? '',
    email,
    attributes: { email, email_verified: true, sub: user.userId ?? '' },
  };
}
