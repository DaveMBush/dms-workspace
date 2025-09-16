import * as crypto from 'crypto';
import { FastifyRequest } from 'fastify';

export function generateSessionId(request: FastifyRequest): string {
  const ip = request.ip ?? 'unknown';
  const userAgent = request.headers['user-agent'] ?? 'unknown';
  const timestamp = Math.floor(Date.now() / 60000); // Group by minute

  return crypto
    .createHash('sha256')
    .update(`${ip}-${userAgent}-${timestamp}`)
    .digest('hex')
    .substring(0, 32);
}
