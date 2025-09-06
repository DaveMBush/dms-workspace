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
  if (authService.isAuthenticated()) {
    // Verify session is still valid
    const isValid = await authService.isSessionValid();
    if (isValid) {
      return true;
    }
    // Session expired, sign out and redirect to login
    await authService.signOut();
    return false;
  }

  // Not authenticated, redirect to login
  // Access denied: User not authenticated, redirecting to login
  await router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });

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

  // If user is authenticated, redirect to dashboard
  if (authService.isAuthenticated()) {
    // Already authenticated, redirecting to dashboard
    await router.navigate(['/']);
    return false;
  }

  return true;
};
