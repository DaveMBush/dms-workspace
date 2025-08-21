export interface SyncSummary {
  inserted: number;
  updated: number;
  markedExpired: number;
  selectedCount: number;
  correlationId: string;
  logFilePath: string;
}
