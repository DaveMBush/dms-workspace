import { Injectable, signal } from '@angular/core';
import {
  AuthSession as AmplifyAuthSession,
  fetchAuthSession,
} from '@aws-amplify/auth';
import { BehaviorSubject, lastValueFrom, Observable, timer } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

/**
 * Service for automatic JWT token refresh management
 * Handles token expiration monitoring, refresh scheduling, and error recovery
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private refreshInProgress = signal(false);
  private refreshSubject = new BehaviorSubject<boolean>(false);
  private refreshTimer?: Observable<number>;
  private refreshSubscription?: { unsubscribe(): void };

  // Token refresh configuration
  private readonly refreshBufferTime = 5 * 60 * 1000; // 5 minutes before expiration
  private readonly maxRetryAttempts = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly maxBackoffDelay = 30000; // 30 seconds

  /**
   * Start monitoring token expiration and schedule automatic refresh
   */
  startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();

    const tokenInfo = this.getTokenExpirationInfo();
    if (!tokenInfo) {
      // No token found, cannot start refresh timer
      return;
    }

    const timeUntilRefresh =
      tokenInfo.expiresAt - Date.now() - this.refreshBufferTime;

    if (timeUntilRefresh <= 0) {
      // Token already needs refresh - comment placeholder
      // Token needs immediate refresh
      this.performTokenRefresh().subscribe({
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS callback functions
        next: () => {
          this.startTokenRefreshTimer();
        },
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS callback functions
        error: (error: unknown) => {
          this.handleRefreshFailure(error);
        },
      });
      return;
    }

    // Scheduling token refresh - comment placeholder

    this.refreshTimer = timer(timeUntilRefresh);
    this.refreshSubscription = this.refreshTimer
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS operator callback
      .pipe(switchMap(() => this.performTokenRefresh()))
      .subscribe({
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS subscribe callbacks
        next: () => {
          // Token refreshed successfully, scheduling next refresh
          this.startTokenRefreshTimer(); // Schedule next refresh
        },
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS subscribe callbacks
        error: (error: unknown) => {
          // Token refresh failed - error placeholder
          this.handleRefreshFailure(error);
        },
      });
  }

  /**
   * Manually refresh the current token
   * Returns a promise that resolves to success status
   */
  async refreshToken(): Promise<boolean> {
    if (this.refreshInProgress()) {
      // Wait for ongoing refresh to complete - use from() to convert to observable
      // eslint-disable-next-line no-restricted-syntax -- Converting Observable to Promise is necessary for async/await pattern
      return lastValueFrom(this.refreshSubject.pipe(take(1)));
    }

    try {
      // eslint-disable-next-line no-restricted-syntax -- Converting Observable to Promise is necessary for async/await pattern
      const success = await lastValueFrom(
        this.performTokenRefresh().pipe(take(1))
      );
      return success ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a token refresh is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.refreshInProgress();
  }

  /**
   * Get the current token expiration time
   */
  getTokenExpiration(): Date | null {
    const tokenInfo = this.getTokenExpirationInfo();
    return tokenInfo ? new Date(tokenInfo.expiresAt) : null;
  }

  /**
   * Check if the current token will expire within the buffer time
   */
  isTokenNearExpiry(): boolean {
    const tokenInfo = this.getTokenExpirationInfo();
    if (!tokenInfo) {
      return true;
    }

    const timeUntilExpiry = tokenInfo.expiresAt - Date.now();
    return timeUntilExpiry <= this.refreshBufferTime;
  }

  /**
   * Stop the automatic token refresh timer
   */
  stopTokenRefreshTimer(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
    this.refreshTimer = undefined;
    // Token refresh timer stopped
  }

  /**
   * Perform the actual token refresh with retry logic
   */
  private performTokenRefresh(): Observable<boolean> {
    this.refreshInProgress.set(true);

    const context = this;
    return new Observable<boolean>(function createRefreshObservable(observer) {
      context
        .attemptRefreshWithRetry(0)
        .then(function handleRefreshSuccess(success) {
          context.refreshInProgress.set(false);
          context.refreshSubject.next(success);
          observer.next(success);
          observer.complete();
        })
        .catch(function handleRefreshError(error) {
          context.refreshInProgress.set(false);
          context.refreshSubject.next(false);
          observer.error(error);
        });
    });
  }

  /**
   * Attempt token refresh with exponential backoff retry logic
   */
  private async attemptRefreshWithRetry(attempt: number): Promise<boolean> {
    try {
      const session = await this.fetchAuthSessionAndValidate();
      this.storeRefreshedTokens(session);
      return true;
    } catch (error) {
      return this.handleRefreshRetry(error, attempt);
    }
  }

  /**
   * Fetch and validate auth session
   */
  private async fetchAuthSessionAndValidate(): Promise<AmplifyAuthSession> {
    const session = await fetchAuthSession();

    const hasValidTokens = this.validateAmplifySessionTokens(session.tokens);
    if (!hasValidTokens) {
      throw new Error('Invalid session: missing tokens');
    }

    return session;
  }

  /**
   * Validate Amplify session tokens
   */
  private validateAmplifySessionTokens(
    tokens?: AmplifyAuthSession['tokens']
  ): boolean {
    if (!tokens) {
      return false;
    }
    return Boolean(
      tokens.accessToken !== null &&
        tokens.idToken !== null &&
        tokens.accessToken !== null &&
        tokens.idToken !== null
    );
  }

  /**
   * Store refreshed tokens from session
   */
  private storeRefreshedTokens(session: AmplifyAuthSession): void {
    const tokens = session.tokens;
    if (!tokens?.accessToken || !tokens?.idToken) {
      throw new Error('Cannot store tokens: invalid tokens');
    }

    const accessToken = String(tokens.accessToken);
    const idToken = String(tokens.idToken);
    // Note: refreshToken is handled differently in AWS Amplify v6
    this.storeTokens(accessToken, idToken, '');
  }

  /**
   * Handle refresh retry logic
   */
  private async handleRefreshRetry(
    error: unknown,
    attempt: number
  ): Promise<boolean> {
    if (attempt < this.maxRetryAttempts - 1) {
      const delay = Math.min(
        this.retryDelay * Math.pow(2, attempt),
        this.maxBackoffDelay
      );
      await this.delay(delay);
      return this.attemptRefreshWithRetry(attempt + 1);
    }
    throw error;
  }

  /**
   * Get token expiration information from stored access token
   */
  private getTokenExpirationInfo(): { expiresAt: number } | null {
    const token = sessionStorage.getItem('dms_access_token');
    if (token === null || token.length === 0) {
      return null;
    }

    try {
      const payload = JSON.parse(this.decodeBase64Url(token.split('.')[1])) as {
        exp?: number;
      };
      if (typeof payload.exp !== 'number' || payload.exp === 0) {
        return null;
      }

      return { expiresAt: payload.exp * 1000 };
    } catch {
      // Failed to parse token expiration
      return null;
    }
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(
    accessToken: string,
    idToken: string,
    refreshToken: string
  ): void {
    try {
      sessionStorage.setItem('dms_access_token', accessToken);
      sessionStorage.setItem('dms_id_token', idToken);
      sessionStorage.setItem('dms_refresh_token', refreshToken);

      // Store expiration time for quick access
      const payload = JSON.parse(
        this.decodeBase64Url(accessToken.split('.')[1])
      ) as { exp?: number };
      if (typeof payload.exp === 'number' && payload.exp > 0) {
        sessionStorage.setItem('dms_token_expiration', payload.exp.toString());
      }

      // Tokens stored successfully
    } catch {
      // Failed to store tokens - error placeholder
    }
  }

  /**
   * Decode a base64url-encoded JWT segment to a UTF-8 string.
   * Uses browser-native atob() instead of Node.js Buffer.
   */
  private decodeBase64Url(base64Url: string): string {
    // Convert base64url to standard base64 (JWT uses - and _ instead of + and /)
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    // Use TextDecoder for proper UTF-8 support
    function charCode(c: string): number {
      return c.charCodeAt(0);
    }
    const bytes = Uint8Array.from(binary, charCode);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Delay execution for the specified number of milliseconds
   */
  private async delay(ms: number): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax -- Promise is necessary for delay functionality
    return new Promise(function delayTimer(resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Handle permanent token refresh failure
   */
  private handleRefreshFailure(_: unknown): void {
    // Token refresh failed permanently - error placeholder

    // Clear tokens and notify about failure
    this.clearStoredTokens();

    // Emit refresh failure event
    this.refreshSubject.next(false);

    // Could emit an event here for the auth service to handle logout
    // Token refresh failed, authentication may be required
  }

  /**
   * Clear all stored tokens
   */
  private clearStoredTokens(): void {
    try {
      sessionStorage.removeItem('dms_access_token');
      sessionStorage.removeItem('dms_id_token');
      sessionStorage.removeItem('dms_refresh_token');
      sessionStorage.removeItem('dms_token_expiration');
      // Stored tokens cleared
    } catch {
      // Failed to clear stored tokens - warning placeholder
    }
  }
}
