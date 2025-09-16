export function getAuthCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-auth-token'
    : 'auth-token';
}
