import { FastifyRequest } from 'fastify';

import { auditLogService } from '../services/audit-log-service.instance';
import { createMockRequest } from './create-mock-request.function';

export function logSecurityViolation(
  type: string,
  environment: string,
  additionalData?: Record<string, unknown>
): void {
  const mockRequest = createMockRequest();

  try {
    auditLogService.logSecurityViolation(mockRequest as FastifyRequest, type, {
      environment,
      ...additionalData,
    });
  } catch {
    // Ignore audit logging errors
  }
}
