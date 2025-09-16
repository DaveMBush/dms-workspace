export interface RateLimitEntry {
  count: number;
  resetTime: number;
  failures: number;
}
