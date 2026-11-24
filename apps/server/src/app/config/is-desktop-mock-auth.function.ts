// Desktop (Electron) builds ship without a Cognito deployment: the frontend uses
// MockAuthService and mints an unsigned mock JWT. When DMS_DESKTOP_AUTH=mock,
// authenticateJWT accepts that token instead of enforcing real Cognito validation.
// Cloud/production deployments never set this flag, so they keep full Cognito auth.
export function isDesktopMockAuth(): boolean {
  return process.env.DMS_DESKTOP_AUTH === 'mock';
}
