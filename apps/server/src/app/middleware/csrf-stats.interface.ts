export interface CSRFStats {
  totalTokens: number;
  expiredTokens: number;
  validTokens: number;
  [key: string]: unknown;
}
