import { CSRFStats } from './csrf-stats.interface';
import { csrfTokenStore } from './csrf-token-store.constant';
import { TOKEN_EXPIRY } from './token-expiry.constant';

export function getCSRFStats(): CSRFStats {
  const now = Date.now();
  let expiredTokens = 0;
  let validTokens = 0;

  for (const data of csrfTokenStore.values()) {
    if (data.timestamp + TOKEN_EXPIRY < now) {
      expiredTokens++;
    } else {
      validTokens++;
    }
  }

  return {
    totalTokens: csrfTokenStore.size,
    expiredTokens,
    validTokens,
  };
}
