export interface CusipCacheAuditEntry {
  id: string;
  cusip: string;
  symbol: string;
  action: string;
  source: string;
  userId: string | null;
  reason: string | null;
  createdAt: string;
}
