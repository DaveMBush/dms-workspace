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

function createNoOriginHandler(
  isProduction: boolean,
  isDevelopment: boolean,
  isLocalDevelopment: boolean,
  nodeEnv: string
) {
  return function handleNoOrigin(callback: CorsCallback): void {
    if (isProduction) {
      logSecurityViolation('cors_no_origin_production', nodeEnv);
      callback(new Error('Origin required in production'), false);
    } else if (isDevelopment || isLocalDevelopment) {
      callback(null, true);
    }
  };
}

function createOriginValidator(
  allowedOrigins: string[],
  isDevelopment: boolean,
  isLocalDevelopment: boolean
) {
  return function handleValidOrigin(
    origin: string,
    callback: CorsCallback
  ): boolean {
    if (!isValidOrigin(origin)) {
      callback(new Error('Invalid origin'), false);
      return true;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return true;
    }

    if ((isDevelopment || isLocalDevelopment) && isLocalhostPattern(origin)) {
      callback(null, true);
      return true;
    }

    return false;
  };
}

function createOriginRejector(
  allowedOrigins: string[],
  nodeEnv: string,
  logger: Logger
) {
  return function rejectUnauthorizedOrigin(
    origin: string | undefined,
    callback: CorsCallback
  ): void {
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
  };
}

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
  const isLocalDevelopment =
    nodeEnv === 'local' && !(process.env.USE_LOCAL_SERVICES ?? '');

  const handleNoOrigin = createNoOriginHandler(
    isProduction,
    isDevelopment,
    isLocalDevelopment,
    nodeEnv
  );
  const handleValidOrigin = createOriginValidator(
    allowedOrigins,
    isDevelopment,
    isLocalDevelopment
  );
  const rejectUnauthorizedOrigin = createOriginRejector(
    allowedOrigins,
    nodeEnv,
    logger
  );

  return function corsOriginHandler(
    origin: string | undefined,
    callback: CorsCallback
  ): void {
    if (origin === undefined) {
      handleNoOrigin(callback);
      return;
    }

    if (handleValidOrigin(origin, callback)) {
      return;
    }

    rejectUnauthorizedOrigin(origin, callback);
  };
}
