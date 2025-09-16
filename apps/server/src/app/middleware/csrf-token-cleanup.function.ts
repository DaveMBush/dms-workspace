import { csrfTokenStore } from './csrf-token-store.constant';
import { TOKEN_EXPIRY } from './token-expiry.constant';

function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, data] of csrfTokenStore.entries()) {
    if (data.timestamp + TOKEN_EXPIRY < now) {
      csrfTokenStore.delete(key);
    }
  }
}

// Cleanup expired tokens every 15 minutes
setInterval(cleanupExpiredTokens, 15 * 60 * 1000);
