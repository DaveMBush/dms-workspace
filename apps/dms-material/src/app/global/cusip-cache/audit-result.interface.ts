import { CusipCacheAuditEntry } from './cusip-cache-audit-entry.interface';

export interface AuditResult {
  entries: CusipCacheAuditEntry[];
  total: number;
}
