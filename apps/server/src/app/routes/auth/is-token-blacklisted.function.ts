import { tokenBlacklistService } from './token-blacklist.function';

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklistService.isTokenBlacklisted(token);
}
