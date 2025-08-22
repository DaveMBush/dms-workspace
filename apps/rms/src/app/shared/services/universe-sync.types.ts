/**
 * Sync Summary Interface
 * 
 * Defines the structure of the response returned from universe synchronization operations.
 * This interface represents the detailed results of syncing universe data with the external screener.
 * 
 * Used by the UniverseSyncService to provide feedback on sync operations and display
 * detailed results to users via toast notifications.
 */
export interface SyncSummary {
  /** Number of new securities inserted into the universe */
  inserted: number;
  /** Number of existing securities updated with new data */
  updated: number;
  /** Number of securities marked as expired/inactive */
  markedExpired: number;
  /** Total count of securities selected from screener */
  selectedCount: number;
  /** Unique identifier for tracking this sync operation */
  correlationId: string;
  /** File path to detailed sync operation logs */
  logFilePath: string;
}
