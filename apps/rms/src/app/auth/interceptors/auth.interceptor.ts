import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthService } from '../auth.service';

/**
 * No-operation function for ignoring promise rejections
 */
function noop(): void {
  // Empty function for ignoring errors
}

/**
 * Authentication interceptor for automatically adding JWT tokens to HTTP requests
 * and handling authentication errors (401/403)
 */
export const authInterceptor: HttpInterceptorFn = function authInterceptorImpl(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip authentication for public endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  // Skip authentication for auth-related endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Add authorization header with token
  return from(authService.getAccessToken()).pipe(
    switchMap(function handleToken(token) {
      let authReq = req;

      if (token !== null && token.length > 0) {
        authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'X-Request-ID': generateRequestId(),
          },
        });
      }

      // Handle response and errors
      return next(authReq).pipe(
        catchError(function handleHttpError(error: unknown) {
          const httpError = error as HttpErrorResponse;
          if (httpError.status === 401 || httpError.status === 403) {
            // Authentication error, log out user and navigate to login
            authService.signOut().catch(noop);
            router.navigate(['/auth/login']).catch(noop);
            return EMPTY;
          }
          function returnError(): unknown {
            return error;
          }
          return throwError(returnError);
        })
      );
    }),
    catchError(function handleTokenError() {
      // Failed to get token, proceed without authentication
      return next(req);
    })
  );
};

/**
 * Check if the request URL is for a public endpoint that doesn't need authentication
 */
function isPublicEndpoint(url: string): boolean {
  const publicEndpoints = [
    '/health',
    '/api/health',
    '/api/version',
    '/favicon.ico',
  ];

  return publicEndpoints.some(function checkEndpoint(endpoint) {
    return url.includes(endpoint);
  });
}

/**
 * Check if the request URL is for authentication-related endpoints
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = [
    '/auth/',
    '/oauth/',
    '/login',
    '/logout',
    '/register',
    '/forgot-password',
    '/reset-password',
  ];

  return authEndpoints.some(function checkAuthEndpoint(endpoint) {
    return url.includes(endpoint);
  });
}

/**
 * Generate a unique request ID for tracking and debugging
 */
function generateRequestId(): string {
  // Use crypto.getRandomValues for better randomness if available
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0].toString(36) + Date.now().toString(36);
  }
  // Fallback to Math.random for environments without crypto
  // eslint-disable-next-line sonarjs/pseudo-random -- Math.random is safe for request ID generation
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
