/**
 * Clear all authentication tokens from storage
 */
export function clearAuthTokens(): void {
  try {
    [
      'rms_access_token',
      'rms_id_token',
      'rms_refresh_token',
      'rms_token_expiration',
    ].forEach(function removeStorageKey(key) {
      sessionStorage.removeItem(key);
    });
  } catch {
    // Failed to clear tokens
  }
}
