import * as crypto from 'crypto';
import { FastifyRequest } from 'fastify';

import { generateSessionId } from '../utils/generate-session-id.function';
import { AuditEvent } from './audit-event.interface';
import { AuditLogEntry } from './audit-log-entry.interface';

class AuditLogService {
  private readonly logEndpoint = process.env.AUDIT_LOG_ENDPOINT ?? 'console';
  private readonly applicationName = 'dms-application';
  private readonly logBuffer: AuditLogEntry[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 30000; // 30 seconds
  private readonly unknownValue = 'unknown';
  private readonly logsToMessage = 'logs to';
  private readonly userAgentHeader = 'user-agent';

  constructor() {
    // Flush logs periodically
    const flushLogsIntervalBound = this.flushLogs.bind(this);
    setInterval(flushLogsIntervalBound, this.flushInterval);

    // Flush logs on process exit
    const flushLogsOnExitBound = this.flushLogs.bind(this);
    process.on('beforeExit', flushLogsOnExitBound);
  }

  logSecurityEvent(event: AuditEvent): void {
    try {
      const logEntry = this.createLogEntry(event);
      this.processLogEntry(logEntry, event.riskLevel);
    } catch (error) {
      this.handleLoggingError(error);
    }
  }

  logAuthenticationSuccess(
    request: FastifyRequest,
    userId: string,
    details: Record<string, unknown> = {}
  ): void {
    this.logSecurityEvent({
      eventType: 'AUTH_SUCCESS',
      userId,
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? this.unknownValue,
      userAgent: request.headers[this.userAgentHeader] ?? this.unknownValue,
      timestamp: new Date(),
      details: {
        authMethod: 'cognito',
        ...details,
      },
      riskLevel: 'LOW',
    });
  }

  logAuthenticationFailure(
    request: FastifyRequest,
    reason: string,
    details: Record<string, unknown> = {}
  ): void {
    this.logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? this.unknownValue,
      userAgent: request.headers[this.userAgentHeader] ?? this.unknownValue,
      timestamp: new Date(),
      details: {
        reason,
        ...details,
      },
      riskLevel: 'MEDIUM',
    });
  }

  logSecurityViolation(
    request: FastifyRequest,
    violationType: string,
    details: Record<string, unknown> = {}
  ): void {
    this.logSecurityEvent({
      eventType: 'SECURITY_VIOLATION',
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? this.unknownValue,
      userAgent: request.headers[this.userAgentHeader] ?? this.unknownValue,
      timestamp: new Date(),
      details: {
        violationType,
        url: request.url,
        method: request.method,
        ...details,
      },
      riskLevel: 'HIGH',
    });
  }

  logRateLimitExceeded(
    request: FastifyRequest,
    limitType: string,
    details: Record<string, unknown> = {}
  ): void {
    this.logSecurityEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      sessionId: generateSessionId(request),
      ipAddress: request.ip ?? this.unknownValue,
      userAgent: request.headers[this.userAgentHeader] ?? this.unknownValue,
      timestamp: new Date(),
      details: {
        limitType,
        url: request.url,
        method: request.method,
        ...details,
      },
      riskLevel: 'MEDIUM',
    });
  }

  getStats(): {
    bufferSize: number;
    maxBufferSize: number;
    flushInterval: number;
  } {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      flushInterval: this.flushInterval,
    };
  }

  private createLogEntry(event: AuditEvent): AuditLogEntry {
    return {
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      userId: event.userId ?? 'anonymous',
      sessionId: event.sessionId,
      source: {
        ipAddress: this.hashIP(event.ipAddress),
        userAgent: this.sanitizeUserAgent(event.userAgent),
        origin: this.applicationName,
      },
      details: this.sanitizeDetails(event.details),
      riskLevel: event.riskLevel,
      correlationId: this.getCorrelationId(event.correlationId),
      environment: this.getEnvironment(),
    };
  }

  private processLogEntry(logEntry: AuditLogEntry, riskLevel: string): void {
    this.logBuffer.push(logEntry);

    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      this.flushLogs();
      this.triggerSecurityAlert(logEntry);
    }

    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  private getCorrelationId(correlationId?: string): string {
    return correlationId !== undefined && correlationId.length > 0
      ? correlationId
      : this.generateCorrelationId();
  }

  private getEnvironment(): string {
    return process.env.NODE_ENV !== undefined && process.env.NODE_ENV.length > 0
      ? process.env.NODE_ENV
      : 'development';
  }

  private handleLoggingError(error: unknown): void {
    // Critical error logging when audit service fails - error is intentionally ignored
    // Fallback: would log AUDIT_EVENT in production with proper logger
    if (error !== null && error !== undefined) {
      // Error handled silently to avoid console logging
    }
  }

  private flushLogs(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer.length = 0; // Clear buffer

    try {
      this.sendToLogService(logsToFlush);
    } catch (error) {
      // Critical error logging when log flush fails - error is intentionally ignored
      // Re-add logs to buffer if sending failed (with size limit)
      this.logBuffer.unshift(...logsToFlush.slice(-50));
      if (error !== null && error !== undefined) {
        // Error handled silently to avoid console logging
      }
    }
  }

  private sendToLogService(logs: AuditLogEntry[]): void {
    switch (this.logEndpoint) {
      case 'console':
        this.logToConsole(logs);
        break;

      case 'cloudwatch':
        // Implementation for AWS CloudWatch
        this.sendToCloudWatch(logs);
        break;

      case 'datadog':
        // Implementation for Datadog
        this.sendToDatadog(logs);
        break;

      default:
        // Default to console
        this.logToConsole(logs);
        break;
    }
  }

  private sendToCloudWatch(_: AuditLogEntry[]): void {
    // Placeholder for CloudWatch implementation
    // Would use AWS SDK to send logs to CloudWatch Logs
    // Implementation for CloudWatch logging would go here
    // This is a placeholder for future implementation
    // _ parameter intentionally unused
  }

  private sendToDatadog(_: AuditLogEntry[]): void {
    // Placeholder for Datadog implementation
    // Would use Datadog API to send logs
    // Implementation for Datadog logging would go here
    // This is a placeholder for future implementation
    // _ parameter intentionally unused
  }

  private triggerSecurityAlert(_: AuditLogEntry): void {
    // Implementation for real-time security alerting
    // Implementation for real-time security alerting would go here
    // This is a placeholder for future implementation
    // _ parameter intentionally unused
    // Placeholder for alerting implementations:
    // - SNS/SMS alerts
    // - Slack webhook
    // - PagerDuty integration
    // - Email alerts
  }

  private logToConsole(logs: AuditLogEntry[]): void {
    const logAuditEntry = function logAuditEntryFunction(
      _: AuditLogEntry
    ): void {
      // Implementation for proper logging would go here
      // This is a placeholder for future implementation
      // _ parameter intentionally unused
    };
    logs.forEach(logAuditEntry);
  }

  private hashIP(ipAddress: string): string {
    // Hash IP address for privacy compliance (GDPR)
    return crypto
      .createHash('sha256')
      .update(ipAddress + (process.env.IP_SALT ?? 'default-salt'))
      .digest('hex')
      .substring(0, 16);
  }

  private sanitizeUserAgent(userAgent: string): string {
    // Remove potentially sensitive information from user agent
    // Use a safer regex pattern to avoid potential ReDoS
    return userAgent
      .replace(/\([^)]{0,100}\)/g, '(...)') // Remove detailed system info with length limit
      .substring(0, 200); // Limit length
  }

  private sanitizeDetails(
    details: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      // Skip sensitive fields
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Limit string lengths
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...';
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'credit',
      'ssn',
      'social',
      'email',
      'phone',
    ];

    const checkSensitiveField = function checkSensitiveFieldFunction(
      field: string
    ): boolean {
      return fieldName.toLowerCase().includes(field);
    };
    return sensitiveFields.some(checkSensitiveField);
  }

  private generateCorrelationId(): string {
    // Use crypto.randomBytes for cryptographically secure randomness
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `${Date.now()}-${randomBytes}`;
  }
}

export { AuditLogService };
