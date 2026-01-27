/**
 * Response from universe fields update operation
 */
export interface UpdateFieldsSummary {
  /**
   * Number of universe entries updated
   */
  updated: number;

  /**
   * Optional correlation ID for tracking
   */
  correlationId?: string;

  /**
   * Optional log file path
   */
  logFilePath?: string;
}
