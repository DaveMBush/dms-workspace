export enum AuthErrorType {
  MissingToken = 'MISSING_TOKEN',
  InvalidFormat = 'INVALID_FORMAT',
  ExpiredToken = 'EXPIRED_TOKEN',
  InvalidSignature = 'INVALID_SIGNATURE',
  InvalidAudience = 'INVALID_AUDIENCE',
  InvalidIssuer = 'INVALID_ISSUER',
  JwksError = 'JWKS_ERROR',
}
