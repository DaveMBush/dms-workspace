/* eslint-disable @smarttools/one-exported-item-per-file -- Auth guards are closely related */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth.service';

/**
 * Authentication guard to protect routes that require user authentication
 *
 * @returns true if user is authenticated, false otherwise (redirects to login)
 */
// eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for Angular guard definition
export const authGuard: CanActivateFn = async (__, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  let isAuthenticated = false;
  try {
    isAuthenticated = authService.isAuthenticated();
  } catch {
    // Auth service error, treat as unauthenticated
    isAuthenticated = false;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    await redirectToLogin(router, state.url);
    return false;
  }

  // User is authenticated, verify session is still valid
  const isSessionValid = await checkSessionValidity(authService);
  if (isSessionValid) {
    return true;
  }

  // Session expired or validation failed, sign out
  await performSignOut(authService);
  return false;
};

/**
 * Guest guard to prevent authenticated users from accessing login/register pages
 *
 * @returns true if user is not authenticated, false otherwise (redirects to dashboard)
 */
// eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for Angular guard definition
export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  let isAuthenticated = false;
  try {
    isAuthenticated = authService.isAuthenticated();
  } catch {
    // Auth service error, allow access (treat as unauthenticated)
    isAuthenticated = false;
  }

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    await redirectToDashboard(router);
    return false;
  }

  return true;
};

/**
 * Helper function to redirect to login page
 */
async function redirectToLogin(
  router: Router,
  returnUrl: string
): Promise<void> {
  try {
    await router.navigate(['/auth/login'], {
      queryParams: { returnUrl },
    });
  } catch {
    // Navigation error, but continue
  }
}

/**
 * Helper function to redirect to dashboard
 */
async function redirectToDashboard(router: Router): Promise<void> {
  try {
    await router.navigate(['/']);
  } catch {
    // Navigation error, but continue
  }
}

/**
 * Helper function to check session validity
 */
async function checkSessionValidity(
  authService: AuthService
): Promise<boolean> {
  try {
    return await authService.isSessionValid();
  } catch {
    // Session validation failed, treat as expired
    return false;
  }
}

/**
 * Helper function to perform sign out
 */
async function performSignOut(authService: AuthService): Promise<void> {
  try {
    await authService.signOut();
  } catch {
    // Ignore signOut errors
  }
}
