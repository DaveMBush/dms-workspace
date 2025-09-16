interface TokenBlacklistEntry {
  token: string;
  timestamp: number;
  userId?: string;
  reason: string;
}

// In-memory token blacklist (use Redis in production)
const tokenBlacklist = new Map<string, TokenBlacklistEntry>();

// Cleanup expired blacklisted tokens every hour
function cleanupExpiredBlacklistedTokens(): void {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (entry.timestamp < oneDayAgo) {
      tokenBlacklist.delete(token);
    }
  }
}
setInterval(cleanupExpiredBlacklistedTokens, 60 * 60 * 1000);

function addToBlacklist(
  token: string,
  userId?: string,
  reason: string = 'manual_revocation'
): void {
  tokenBlacklist.set(token, {
    token,
    timestamp: Date.now(),
    userId,
    reason,
  });
}

function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

function getBlacklistStats(): {
  totalBlacklisted: number;
  recentRevocations: number;
} {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let recentRevocations = 0;

  for (const entry of tokenBlacklist.values()) {
    if (entry.timestamp > oneHourAgo) {
      recentRevocations++;
    }
  }

  return {
    totalBlacklisted: tokenBlacklist.size,
    recentRevocations,
  };
}

export const tokenBlacklistService = {
  addToBlacklist,
  isTokenBlacklisted,
  getStats: getBlacklistStats,
};
