export interface AuditLogEntry {
  timestamp: string;
  eventType: string;
  userId: string;
  sessionId: string;
  source: {
    ipAddress: string;
    userAgent: string;
    origin: string;
  };
  details: Record<string, unknown>;
  riskLevel: string;
  correlationId: string;
  environment: string;
}
