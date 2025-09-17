import { isLocalhostPattern } from './is-localhost-pattern.function';
import { isValidOrigin } from './is-valid-origin.function';
import { logSecurityViolation } from './log-security-violation.function';

interface Logger {
  warn(obj: object, msg: string): void;
}

type CorsCallback = (error: Error | null, allow: boolean) => void;

type CorsOriginHandler = (
  origin: string | undefined,
  callback: CorsCallback
) => void;

/**
 * CORS origin validation handler
 */
export function createCorsOriginHandler(
  allowedOrigins: string[],
  nodeEnv: string,
  logger: Logger
): CorsOriginHandler {
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';
  const isLocalDevelopment = nodeEnv === 'local' && !process.env.USE_LOCAL_SERVICES;

  function corsOriginHandler(
    origin: string | undefined,
    callback: CorsCallback
  ): void {
    // In production, be strict about origins
    if (isProduction && origin === undefined) {
      logSecurityViolation('cors_no_origin_production', nodeEnv);
      callback(new Error('Origin required in production'), false);
      return;
    }

    // Allow requests with no origin in development/local development (mobile apps, server-to-server)
    if ((isDevelopment || isLocalDevelopment) && origin === undefined) {
      callback(null, true);
      return;
    }

    if (!isValidOrigin(origin)) {
      callback(new Error('Invalid origin'), false);
      return;
    }

    // Exact match for configured origins
    if (allowedOrigins.includes(origin!)) {
      callback(null, true);
      return;
    }

    // Allow localhost patterns in development and local development
    if ((isDevelopment || isLocalDevelopment) && isLocalhostPattern(origin!)) {
      callback(null, true);
      return;
    }

    // Log and reject unauthorized origins
    logger.warn(
      {
        origin,
        allowedOrigins,
        environment: nodeEnv,
      },
      'CORS origin not allowed'
    );

    logSecurityViolation('cors_unauthorized_origin', nodeEnv, {
      requestedOrigin: origin,
      allowedOrigins: allowedOrigins.length,
    });

    callback(new Error('Not allowed by CORS'), false);
  }

  return corsOriginHandler;
}
