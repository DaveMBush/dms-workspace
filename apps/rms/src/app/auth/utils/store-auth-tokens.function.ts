import { AuthSession } from '../auth.types';

/**
 * Store authentication tokens in session storage
 */
export function storeAuthTokens(session: AuthSession): void {
  try {
    const tokens = [
      ['rms_access_token', session.accessToken],
      ['rms_id_token', session.idToken],
      ['rms_refresh_token', session.refreshToken],
    ];
    tokens.forEach(function setTokenItem([key, value]) {
      sessionStorage.setItem(key, value);
    });
    if (session.expiration !== undefined) {
      sessionStorage.setItem(
        'rms_token_expiration',
        session.expiration.toString()
      );
    }
  } catch {
    // Failed to store tokens
  }
}
