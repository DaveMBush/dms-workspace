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
import { catchError, switchMap, tap } from 'rxjs/operators';

import { AuthService } from '../auth.service';
import { AuthMetricsService } from '../services/auth-metrics.service';
import { TokenRefreshService } from '../services/token-refresh.service';

// Auth endpoints path prefix
const AUTH_LOGIN_PATH = '/auth/login';

/**
 * No-operation function for ignoring promise rejections
 */
function noop(): void {
  // Empty function for ignoring errors
}

/**
 * Authentication interceptor for automatically adding JWT tokens to HTTP requests,
 * handling token refresh, and managing authentication errors (401/403)
 */
export const authInterceptor: HttpInterceptorFn = function authInterceptorImpl(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  return processAuthenticatedRequest(req, next);
};

/**
 * Get error type string from error object
 */
function getErrorType(error: unknown, defaultType = 'unknown-error'): string {
  return error instanceof HttpErrorResponse
    ? `http-${error.status}`
    : defaultType;
}

/**
 * Process authenticated request with token handling
 */
function processAuthenticatedRequest(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  // Skip authentication for public and auth endpoints
  if (isPublicEndpoint(req.url) || isAuthEndpoint(req.url)) {
    return next(req);
  }

  const services = injectAuthServices();
  return executeAuthenticatedRequest(req, next, services);
}

/**
 * Inject required authentication services
 */
function injectAuthServices(): {
  authService: AuthService;
  tokenRefreshService: TokenRefreshService;
  authMetrics: AuthMetricsService;
  router: Router;
} {
  return {
    authService: inject(AuthService),
    tokenRefreshService: inject(TokenRefreshService),
    authMetrics: inject(AuthMetricsService),
    router: inject(Router),
  };
}

/**
 * Execute authenticated request with timing and error handling
 */
function executeAuthenticatedRequest(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  services: ReturnType<typeof injectAuthServices>
): Observable<HttpEvent<unknown>> {
  const requestId = req.headers.get('X-Request-ID');
  const endTiming = services.authMetrics.startOperation(
    'interceptor',
    requestId === null ? undefined : requestId
  );

  return from(
    getTokenWithRefresh(services.authService, services.tokenRefreshService)
  ).pipe(
    switchMap(function handleToken(token) {
      const authReq = createAuthenticatedRequest(req, token);
      return handleRequestExecution(
        authReq,
        next,
        {
          authService: services.authService,
          tokenRefreshService: services.tokenRefreshService,
        },
        services.router
      );
    }),
    tap(createTapHandlers(endTiming, services.authService)),
    catchError(function handleTokenError(error: unknown) {
      const errorType = getErrorType(error, 'token-error');
      endTiming(false, errorType);
      return next(req);
    })
  );
}

/**
 * Create tap handlers for success and error cases
 */
function createTapHandlers(
  endTiming: (success: boolean, errorType?: string, cacheHit?: boolean) => void,
  authService: AuthService
): {
  next(): void;
  error(error: unknown): void;
} {
  return {
    next: function onSuccess() {
      endTiming(true, undefined, authService.getCachedAccessToken() !== null);
    },
    error: function onError(error: unknown) {
      const errorType = getErrorType(error);
      endTiming(false, errorType);
    },
  };
}

/**
 * Create authenticated request with token header
 */
function createAuthenticatedRequest(
  req: HttpRequest<unknown>,
  token: string | null
): HttpRequest<unknown> {
  if (token !== null && token.length > 0) {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': generateRequestId(),
      },
    });
  }
  return req;
}

/**
 * Handle request execution with error handling
 */
function handleRequestExecution(
  authReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  services: {
    authService: AuthService;
    tokenRefreshService: TokenRefreshService;
  },
  router: Router
): Observable<HttpEvent<unknown>> {
  return next(authReq).pipe(
    catchError(function handleHttpError(error: unknown) {
      const httpError = error as HttpErrorResponse;
      if (httpError.status === 401) {
        return handleUnauthorizedError(authReq, next, services, router);
      }
      if (httpError.status === 403) {
        return handleForbiddenError(services.authService, router);
      }
      return throwError(function returnError() {
        return error;
      });
    })
  );
}

/**
 * Handle forbidden access error
 */
function handleForbiddenError(
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  // Forbidden - user doesn't have permission
  return performSignOut(authService, router);
}

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
 * Get token with automatic refresh if needed
 * Fast path: only use cached token, don't wait for expensive fetches
 */
async function getTokenWithRefresh(
  authService: AuthService,
  tokenRefreshService: TokenRefreshService
): Promise<string | null> {
  // Fast path: check cache first without triggering expensive AWS calls
  const cachedToken = authService.getCachedAccessToken();

  if (
    cachedToken !== null &&
    cachedToken !== undefined &&
    cachedToken.length > 0
  ) {
    // We have a cached token, check if it needs refresh
    if (tokenRefreshService.isTokenNearExpiry()) {
      // Token near expiry, trigger background refresh but return current token
      tokenRefreshService
        .refreshToken()
        .catch(function ignoreBackgroundRefreshError() {
          // Background refresh failed, ignore for now
        });
    }
    return cachedToken;
  }

  // No cached token, fall back to expensive fetch
  // This should only happen on first load
  return authService.getAccessToken();
}

/**
 * Handle 401 unauthorized error with token refresh retry
 */
function handleUnauthorizedError(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  services: {
    authService: AuthService;
    tokenRefreshService: TokenRefreshService;
  },
  router: Router
): Observable<HttpEvent<unknown>> {
  // 401 error encountered, attempting token refresh

  // Don't attempt refresh for auth endpoints
  if (isAuthEndpoint(request.url)) {
    return signOutAndRedirect(services.authService, router);
  }

  return attemptTokenRefreshAndRetry(request, next, services, router);
}

/**
 * Attempt token refresh and retry request
 */
function attemptTokenRefreshAndRetry(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  services: {
    authService: AuthService;
    tokenRefreshService: TokenRefreshService;
  },
  router: Router
): Observable<HttpEvent<unknown>> {
  return from(services.tokenRefreshService.refreshToken()).pipe(
    switchMap(function handleRefreshResult(refreshSuccess) {
      if (refreshSuccess) {
        return retryRequestWithNewToken(
          request,
          next,
          services.authService,
          router
        );
      }
      // Refresh failed, sign out user
      return signOutAndRedirect(services.authService, router);
    }),
    catchError(function handleRefreshError(_: unknown) {
      // Error during token refresh retry
      return signOutAndRedirect(services.authService, router);
    })
  );
}

/**
 * Retry request with new token
 */
function retryRequestWithNewToken(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  return from(authService.getAccessToken()).pipe(
    switchMap(function retryWithNewToken(newToken) {
      const hasValidNewToken =
        newToken !== null && newToken !== undefined && newToken.length > 0;
      if (hasValidNewToken) {
        const retryRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`,
            'X-Request-ID': generateRequestId(),
          },
        });
        // Retrying request with refreshed token
        return next(retryRequest);
      }
      // No token after refresh, sign out
      return signOutAndRedirect(authService, router);
    })
  );
}

/**
 * Sign out user and redirect to login page
 */
function signOutAndRedirect(
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  // Delegate to sign out handler
  return performSignOut(authService, router);
}

/**
 * Perform sign out operations with additional cleanup
 */
function performSignOut(
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  // Clear tokens and user state
  authService.signOut().catch(noop);
  // Navigate to login page
  router.navigate([AUTH_LOGIN_PATH]).catch(noop);
  return EMPTY;
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
