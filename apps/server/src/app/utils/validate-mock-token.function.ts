import { AuthenticatedUser } from '../types/auth.types';

// The desktop frontend (MockAuthService) mints an unsigned, base64url JWT with a
// fixed issuer and no cryptographic signature. This is NOT real authentication —
// it only confirms the token is well-formed, unexpired, and issued by our mock
// service. It runs exclusively when DMS_DESKTOP_AUTH=mock (see
// is-desktop-mock-auth.function.ts), which cloud/production builds never set.
const MOCK_ISSUER = 'mock-auth-service';

interface MockTokenPayload {
  sub?: string;
  email?: string;
  username?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function validateMockToken(token: string): AuthenticatedUser {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid mock token format');
  }

  let payload: MockTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1])) as MockTokenPayload;
  } catch {
    throw new Error('Invalid mock token payload');
  }

  if (payload.iss !== MOCK_ISSUER) {
    throw new Error('Invalid mock token issuer');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
    throw new Error('Mock token expired');
  }

  const email = typeof payload.email === 'string' ? payload.email : '';
  const username =
    typeof payload.username === 'string' ? payload.username : email;

  return {
    sub: payload.sub ?? `mock-${email}`,
    email,
    username,
    groups: [],
    exp: payload.exp,
    iat: payload.iat,
  };
}
