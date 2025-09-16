import { tokenBlacklistService } from './token-blacklist.function';

export function getBlacklistStats(): {
  totalBlacklisted: number;
  recentRevocations: number;
} {
  return tokenBlacklistService.getStats();
}
