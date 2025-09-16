export interface AuditEvent {
  eventType:
    | 'AUTH_FAILURE'
    | 'AUTH_SUCCESS'
    | 'CSRF_VIOLATION'
    | 'LOGOUT'
    | 'PASSWORD_CHANGE'
    | 'PROFILE_UPDATE'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SECURITY_VIOLATION'
    | 'SUSPICIOUS_ACTIVITY'
    | 'TOKEN_REFRESH';
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, unknown>;
  riskLevel: 'CRITICAL' | 'HIGH' | 'LOW' | 'MEDIUM';
  correlationId?: string;
}
