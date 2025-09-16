/**
 * Configuration helper for CORS allowed origins
 */
export function buildAllowedOrigins(): string[] {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';

  return [
    ...(isDevelopment
      ? [
          'http://localhost:4200', // Development Angular app
          'http://localhost:3000', // Alternative dev port
          'http://127.0.0.1:4200', // Explicit localhost IP
        ]
      : []),
    ...(isProduction && process.env.FRONTEND_URL !== undefined
      ? [process.env.FRONTEND_URL]
      : []),
    ...(process.env.ALLOWED_ORIGINS !== undefined
      ? process.env.ALLOWED_ORIGINS.split(',').map(function trimOrigin(
          origin: string
        ): string {
          return origin.trim();
        })
      : []),
  ].filter(Boolean);
}
