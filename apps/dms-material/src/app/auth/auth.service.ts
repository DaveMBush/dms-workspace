import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from '@aws-amplify/auth';
import { firstValueFrom, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthError } from './auth.types';
import { BaseAuthService } from './base-auth-service.abstract';
import { SecureCookieService } from './services/secure-cookie.service';
import {
  SessionEvent,
  SessionEventType,
  SessionManagerService,
  SessionStatus,
} from './services/session-manager.service';
import { TokenCacheService } from './services/token-cache.service';
import { TokenHandlerService } from './services/token-handler.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { UserProfile } from './services/user-state.service';
import { mapAmplifyUserToAuthUser } from './utils/amplify-user-mapper.function';
import { getAuthErrorMessage } from './utils/auth-error-handler.function';
import { clearAuthTokens } from './utils/clear-auth-tokens.function';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseAuthService {
  private sessionManager!: SessionManagerService;
  private tokenCache!: TokenCacheService;
  private tokenRefresh!: TokenRefreshService;
  private secureCookieService!: SecureCookieService;
  private tokenHandler!: TokenHandlerService;

  // Session-related signals
  private rememberMePreference = signal(false);

  constructor() {
    super();
    this.sessionManager = inject(SessionManagerService);
    this.tokenCache = inject(TokenCacheService);
    this.tokenRefresh = inject(TokenRefreshService);
    this.secureCookieService = inject(SecureCookieService);
    this.tokenHandler = inject(TokenHandlerService);
    this.setupSessionEventListeners();
    const context = this;
    setTimeout(function initializeAuth() {
      context.initializeAuth().catch(function ignoreError() {
        // Initialization errors are handled by the service
      });
    }, 0);
  }

  async signUp(_: string, __: string, ___: string): Promise<void> {
    return Promise.reject(new Error('Sign up not implemented yet'));
  }

  async signInWithRememberMe(email: string, password: string): Promise<void> {
    this.rememberMePreference.set(true);
    await this.signIn(email, password);
  }

  async signOut(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      this.tokenCache.clear();
      this.sessionManager.expireSession(true);

      // Clear secure cookies if enabled
      await this.clearSecureCookiesIfEnabled();

      await signOut();
      await this.performSignOutCleanup();
    } catch {
      // Ensure cleanup happens even if signOut fails
      await this.performSignOutCleanup();
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async getAccessToken(): Promise<string | null> {
    const cachedToken = this.tokenCache.get('access_token');
    if (cachedToken !== null && cachedToken !== undefined) {
      return cachedToken;
    }
    return this.fetchAndCacheToken('access_token');
  }

  getCachedAccessToken(): string | null {
    return this.tokenCache.get('access_token');
  }

  async refreshTokens(): Promise<void> {
    try {
      this.tokenCache.invalidate('access_token');
      const success = await this.tokenRefresh.refreshToken();
      if (!success) {
        throw new Error('Token refresh failed');
      }
      const tokenExpiration = this.tokenRefresh.getTokenExpiration();
      if (tokenExpiration) {
        this.sessionManager.getSessionStats();
      }
      await this.getAccessToken();
    } catch {
      await this.signOut();
    }
  }

  async isSessionValid(): Promise<boolean> {
    try {
      if (!this.sessionManager.isActive()) {
        return false;
      }
      const session = await fetchAuthSession();
      return (
        session.tokens?.accessToken?.payload.exp !== undefined &&
        session.tokens.accessToken.payload.exp > Date.now() / 1000
      );
    } catch {
      return false;
    }
  }

  async extendSession(): Promise<boolean> {
    return this.sessionManager.extendSession();
  }

  getSessionManager(): SessionManagerService {
    return this.sessionManager;
  }

  isRememberMeSession(): boolean {
    return this.sessionManager.isRememberMeSession();
  }

  getTokenCacheStats(): ReturnType<typeof this.tokenCache.getStats> {
    return this.tokenCache.getStats();
  }

  protected async performAuthentication(
    username: string,
    password: string
  ): Promise<void> {
    try {
      const signInOutput = await signIn({
        username,
        password,
        options: { authFlowType: 'USER_SRP_AUTH' },
      });

      if (signInOutput.isSignedIn) {
        const [user, session] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);
        const authUser = mapAmplifyUserToAuthUser(user);
        this.currentUserSignal.set(authUser);
        await this.tokenHandler.handleSessionTokens(session);
        const userProfile: UserProfile = {
          username: authUser.username,
          email: authUser.email,
          permissions: [],
          attributes: authUser.attributes ?? {},
        };
        this.sessionManager.startSession(
          userProfile,
          this.rememberMePreference()
        );
        this.warmTokenCache(session);
      } else {
        throw new Error(
          'Sign-in incomplete. Please check your email for confirmation.'
        );
      }
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error as AuthError);
      throw new Error(errorMessage);
    }
  }

  protected clearTokens(): void {
    this.tokenCache.clear();
    clearAuthTokens();
  }

  private async fetchAndCacheToken(cacheKey: string): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString() ?? null;
      if (token !== null && token !== undefined) {
        this.cacheTokenWithExpiration(cacheKey, token, session);
      }
      return token;
    } catch {
      return null;
    }
  }

  private cacheTokenWithExpiration(
    cacheKey: string,
    token: string,
    session: unknown
  ): void {
    const sessionData = session as {
      tokens?: {
        accessToken?: { payload: { exp: number } };
      };
    };

    const tokenExpiration = sessionData.tokens?.accessToken?.payload.exp;
    if (tokenExpiration !== undefined && tokenExpiration !== null) {
      const ttl = tokenExpiration * 1000 - Date.now();
      if (ttl > 0 && ttl <= 24 * 60 * 60 * 1000) {
        this.tokenCache.set(cacheKey, token, ttl);
        return;
      }
    }
    this.tokenCache.set(cacheKey, token);
  }

  private warmTokenCache(session: unknown): void {
    const sessionData = session as {
      tokens?: {
        accessToken?: { toString(): string };
      };
    };
    const token = sessionData.tokens?.accessToken?.toString();
    if (token !== null && token !== undefined && token.length > 0) {
      this.cacheTokenWithExpiration('access_token', token, session);
    }
  }

  private async initializeAuth(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user === null) {
        return;
      }
      const authUser = mapAmplifyUserToAuthUser(user);
      this.currentUserSignal.set(authUser);
      const userProfile: UserProfile = {
        username: authUser.username,
        email: authUser.email,
        permissions: [],
        attributes: authUser.attributes ?? {},
      };
      const userState = this.sessionManager.getSessionStats();
      if (userState.status === SessionStatus.Expired) {
        const rememberMe = localStorage.getItem('dms_remember_me') === 'true';
        this.sessionManager.startSession(userProfile, rememberMe);
      }
      await this.refreshTokens();
    } catch {
      this.currentUserSignal.set(null);
    }
  }

  private async clearSecureCookiesIfEnabled(): Promise<void> {
    if (this.secureCookieService.isSecureCookiesEnabled()) {
      try {
        const clearCookiesObservable: Observable<unknown> =
          this.secureCookieService.clearSecureTokens();
        // eslint-disable-next-line no-restricted-syntax -- AWS Amplify integration requires Promise handling
        await firstValueFrom(clearCookiesObservable);
      } catch {
        // Ignore cookie clearing errors during signout
      }
    }
  }

  private setupSessionEventListeners(): void {
    this.sessionManager.sessionEvents
      .pipe(
        takeUntilDestroyed(),
        filter(function filterSessionEvents(event: SessionEvent) {
          return (
            event.type === SessionEventType.SessionExpired ||
            event.type === SessionEventType.TokenRefreshFailed
          );
        })
      )
      .subscribe(
        function handleSessionEvent(this: AuthService, event: SessionEvent) {
          if (event.type === SessionEventType.SessionExpired) {
            void this.performSignOutCleanup();
          } else if (event.type === SessionEventType.TokenRefreshFailed) {
            void this.signOut();
          }
        }.bind(this)
      );
  }
}
