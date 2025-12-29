/**
 * Clear all authentication tokens from storage
 */
export function clearAuthTokens(): void {
  try {
    [
      'dms_access_token',
      'dms_id_token',
      'dms_refresh_token',
      'dms_token_expiration',
    ].forEach(function removeStorageKey(key) {
      sessionStorage.removeItem(key);
    });
  } catch {
    // Failed to clear tokens
  }
}
