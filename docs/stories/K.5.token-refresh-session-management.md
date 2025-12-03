# Story K.5: Token Refresh and Session Management

## Status

Approved

## Story

**As a** single-user application owner,
**I want** to have automatic token refresh and intelligent session management that maintains my login state seamlessly,
**so that** I can work uninterrupted without constant re-authentication while maintaining security best practices.

## Acceptance Criteria

1. Implement automatic JWT access token refresh using Cognito refresh tokens before expiration
2. Handle token refresh failures with graceful logout and user notification
3. Add session timeout warnings with countdown timer before automatic logout
4. Implement optional "Remember Me" functionality with extended refresh token lifetime
5. Add activity-based session extension that resets timeout on user interaction
6. Handle concurrent token refresh requests to prevent race conditions and duplicate refreshes
7. Store minimal user information in client state (username, email, session metadata)
8. Create comprehensive unit and integration tests for all token refresh and session scenarios
9. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`
- `pnpm nx run infrastructure:lint`

## Tasks / Subtasks

- [ ] **Task 1: Implement automatic token refresh mechanism** (AC: 1, 6)

  - [ ] Create `TokenRefreshService` in `/apps/rms/src/app/auth/services/token-refresh.service.ts`
  - [ ] Add automatic refresh logic 5 minutes before access token expiration
  - [ ] Implement mutex/semaphore pattern to prevent concurrent refresh requests
  - [ ] Add retry logic with exponential backoff for failed refresh attempts
  - [ ] Create token expiration monitoring with RxJS timer observables
  - [ ] Add proper error handling for network failures and service outages

- [ ] **Task 2: Handle token refresh failures and error scenarios** (AC: 2)

  - [ ] Implement graceful logout when refresh token is expired or invalid
  - [ ] Add user notification system for authentication errors
  - [ ] Handle refresh token rotation and update stored tokens
  - [ ] Add logging for token refresh events and failures
  - [ ] Implement fallback mechanisms for partial authentication failures
  - [ ] Create user-friendly error messages for different failure scenarios

- [ ] **Task 3: Add session timeout warnings and user notifications** (AC: 3)

  - [ ] Create `SessionWarningComponent` with countdown timer
  - [ ] Show warning dialog 10 minutes before session expiration
  - [ ] Add "Extend Session" button to refresh tokens on user request
  - [ ] Implement auto-dismiss functionality if user becomes active
  - [ ] Style warning component with PrimeNG dialog and proper accessibility
  - [ ] Add sound notification option for session warnings
  - [ ] **IMPORTANT**: Re-enable the skipped e2e tests in `apps/rms-material-e2e/src/session-warning.spec.ts` by removing `test.describe.skip` and implementing a test hook to manually trigger the session warning dialog for testing

- [ ] **Task 4: Implement activity-based session management** (AC: 5)

  - [ ] Create `ActivityTrackingService` to monitor user interactions
  - [ ] Track mouse movements, keyboard input, and API requests as activity
  - [ ] Reset session timeout on detected user activity
  - [ ] Add configurable activity threshold and timeout periods
  - [ ] Implement efficient activity detection without performance impact
  - [ ] Add debugging and monitoring for activity tracking

- [ ] **Task 5: Add "Remember Me" functionality** (AC: 4)

  - [ ] Add "Remember Me" checkbox to login component
  - [ ] Implement extended refresh token lifetime (90 days vs 30 days)
  - [ ] Store "Remember Me" preference securely in encrypted storage
  - [ ] Add device fingerprinting for enhanced security with remember me
  - [ ] Create admin option to disable "Remember Me" functionality
  - [ ] Document security implications and user privacy considerations

- [ ] **Task 6: Implement client-side user state management** (AC: 7)

  - [ ] Create `UserStateService` with signal-based state management
  - [ ] Store minimal user profile information (username, email, permissions)
  - [ ] Add session metadata (login time, last activity, expiration)
  - [ ] Implement secure state persistence across browser sessions
  - [ ] Add state synchronization across multiple browser tabs
  - [ ] Create proper cleanup and garbage collection for user state

- [ ] **Task 7: Integrate with existing authentication services** (AC: 1, 2)

  - [ ] Update `AuthService` to use token refresh service
  - [ ] Integrate session management with HTTP interceptor
  - [ ] Add token refresh to route guard validation
  - [ ] Update logout functionality to clean up all session state
  - [ ] Test integration with existing authentication flow
  - [ ] Ensure backward compatibility with existing authentication code

- [ ] **Task 8: Create comprehensive tests for session management** (AC: 8)
  - [ ] Test automatic token refresh with various expiration scenarios
  - [ ] Test concurrent refresh request handling and race conditions
  - [ ] Test session timeout warnings and user interactions
  - [ ] Test activity tracking and session extension
  - [ ] Test "Remember Me" functionality and extended sessions
  - [ ] Test error handling and graceful failure scenarios

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story K.1 (AWS Cognito Setup) provides JWT token configuration
- Story K.3 (Frontend Login Component) provides AuthService foundation
- Story K.4 (Route Protection) provides HTTP interceptor for token injection

### Data Models and Architecture

**Source: [apps/rms/src/app/auth/auth.service.ts from Story K.3]**

- Existing authentication service with token storage and management
- Signal-based state management for reactive UI updates
- Current token handling: access, ID, and refresh tokens in sessionStorage

**Token Refresh Flow:**

```
Timer Check -> Token Expiry -> Refresh Request -> Update Tokens -> Continue Session
     ↓              ↓              ↓               ↓              ↓
Monitor Expiration  5min Before   AWS Cognito    Store New Tokens  Reset Timer
```

**Session Management Architecture:**

```
User Activity -> Activity Service -> Session Extension -> Token Refresh
      ↓              ↓                   ↓                    ↓
Mouse/Keyboard   Track Activity     Reset Timeout        Extend Session
```

### File Locations

**Primary Files to Create:**

1. `/apps/rms/src/app/auth/services/token-refresh.service.ts` - Token refresh logic
2. `/apps/rms/src/app/auth/services/activity-tracking.service.ts` - User activity monitoring
3. `/apps/rms/src/app/auth/services/user-state.service.ts` - Client-side user state
4. `/apps/rms/src/app/auth/components/session-warning/session-warning.ts` - Session timeout warning
5. `/apps/rms/src/app/auth/services/session-manager.service.ts` - Orchestrates session management

**Primary Files to Modify:**

1. `/apps/rms/src/app/auth/auth.service.ts` - Integrate token refresh and session management
2. `/apps/rms/src/app/auth/login/login.ts` - Add "Remember Me" functionality
3. `/apps/rms/src/app/auth/interceptors/auth.interceptor.ts` - Handle token refresh during requests

**Test Files to Create:**

1. `/apps/rms/src/app/auth/services/token-refresh.service.spec.ts` - Token refresh tests
2. `/apps/rms/src/app/auth/services/session-manager.service.spec.ts` - Session management tests
3. `/apps/rms/src/app/auth/auth-session.integration.spec.ts` - Integration tests

### Technical Implementation Details

**Token Refresh Service:**

```typescript
// apps/rms/src/app/auth/services/token-refresh.service.ts
import { Injectable, signal } from '@angular/core';
import { Auth } from '@aws-amplify/auth';
import { BehaviorSubject, timer, Observable, NEVER } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private refreshInProgress = signal(false);
  private refreshSubject = new BehaviorSubject<boolean>(false);
  private refreshTimer?: Observable<any>;

  private readonly REFRESH_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes before expiration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();

    const tokenInfo = this.getTokenExpirationInfo();
    if (!tokenInfo) return;

    const timeUntilRefresh = tokenInfo.expiresAt - Date.now() - this.REFRESH_BUFFER_TIME;

    if (timeUntilRefresh <= 0) {
      // Token already needs refresh
      this.refreshToken();
      return;
    }

    this.refreshTimer = timer(timeUntilRefresh).pipe(switchMap(() => this.performTokenRefresh()));

    this.refreshTimer.subscribe({
      next: () => {
        console.log('Token refreshed successfully');
        this.startTokenRefreshTimer(); // Schedule next refresh
      },
      error: (error) => {
        console.error('Token refresh failed:', error);
        this.handleRefreshFailure(error);
      },
    });
  }

  async refreshToken(): Promise<boolean> {
    if (this.refreshInProgress()) {
      // Wait for ongoing refresh to complete
      return new Promise((resolve) => {
        const subscription = this.refreshSubject.subscribe((success) => {
          subscription.unsubscribe();
          resolve(success);
        });
      });
    }

    return this.performTokenRefresh().toPromise() ?? false;
  }

  private performTokenRefresh(): Observable<boolean> {
    this.refreshInProgress.set(true);

    return new Observable<boolean>((observer) => {
      this.attemptRefreshWithRetry(0)
        .then((success) => {
          this.refreshInProgress.set(false);
          this.refreshSubject.next(success);
          observer.next(success);
          observer.complete();
        })
        .catch((error) => {
          this.refreshInProgress.set(false);
          this.refreshSubject.next(false);
          observer.error(error);
        });
    });
  }

  private async attemptRefreshWithRetry(attempt: number): Promise<boolean> {
    try {
      const session = await Auth.currentSession();

      // Store refreshed tokens
      const accessToken = session.getAccessToken().getJwtToken();
      const idToken = session.getIdToken().getJwtToken();
      const refreshToken = session.getRefreshToken().getToken();

      this.storeTokens(accessToken, idToken, refreshToken);

      console.log('Token refresh successful', {
        attempt: attempt + 1,
        expiresAt: session.getAccessToken().getExpiration() * 1000,
      });

      return true;
    } catch (error) {
      console.warn(`Token refresh attempt ${attempt + 1} failed:`, error);

      if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
        await this.delay(this.RETRY_DELAY * Math.pow(2, attempt));
        return this.attemptRefreshWithRetry(attempt + 1);
      }

      throw error;
    }
  }

  private getTokenExpirationInfo(): { expiresAt: number } | null {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { expiresAt: payload.exp * 1000 };
    } catch {
      return null;
    }
  }

  private storeTokens(accessToken: string, idToken: string, refreshToken: string): void {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('idToken', idToken);
    sessionStorage.setItem('refreshToken', refreshToken);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleRefreshFailure(error: any): void {
    // Implement logout logic here
    console.error('Token refresh failed permanently, logging out user');
    // This would trigger the auth service logout
  }

  stopTokenRefreshTimer(): void {
    // Clean up timer subscription
    this.refreshTimer = undefined;
  }
}
```

**Activity Tracking Service:**

```typescript
// apps/rms/src/app/auth/services/activity-tracking.service.ts
import { Injectable, signal, NgZone } from '@angular/core';
import { fromEvent, merge, throttleTime, debounceTime } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ActivityTrackingService {
  private lastActivity = signal<Date>(new Date());
  private activityThreshold = 30000; // 30 seconds

  private readonly ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];

  constructor(private ngZone: NgZone) {}

  startActivityTracking(): void {
    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      const activityStreams = this.ACTIVITY_EVENTS.map((event) => fromEvent(document, event));

      merge(...activityStreams)
        .pipe(throttleTime(this.activityThreshold), debounceTime(1000))
        .subscribe(() => {
          // Run in Angular zone to update signals
          this.ngZone.run(() => {
            this.updateLastActivity();
          });
        });
    });

    console.log('Activity tracking started');
  }

  private updateLastActivity(): void {
    this.lastActivity.set(new Date());
  }

  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivity().getTime();
  }

  isUserActive(): boolean {
    return this.getTimeSinceLastActivity() < this.activityThreshold;
  }

  getLastActivity(): Date {
    return this.lastActivity();
  }
}
```

**Session Warning Component:**

```typescript
// apps/rms/src/app/auth/components/session-warning/session-warning.ts
import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { timer, Subscription } from 'rxjs';

@Component({
  selector: 'app-session-warning',
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [(visible)]="showWarning" [modal]="true" [closable]="false" [draggable]="false" styleClass="session-warning-dialog">
      <ng-template pTemplate="header">
        <h3>Session Expiring</h3>
      </ng-template>

      <div class="flex flex-column gap-3 p-4">
        <p class="text-lg">Your session will expire in:</p>
        <div class="text-center">
          <span class="text-4xl font-bold text-orange-500">
            {{ formatTime(timeRemaining()) }}
          </span>
        </div>
        <p class="text-sm text-600">Click "Extend Session" to continue working, or you will be automatically logged out.</p>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Extend Session" icon="pi pi-refresh" styleClass="p-button-success" (onClick)="extendSession()"> </p-button>
        <p-button label="Logout Now" icon="pi pi-sign-out" styleClass="p-button-secondary" (onClick)="logoutNow()"> </p-button>
      </ng-template>
    </p-dialog>
  `,
  styleUrls: ['./session-warning.scss'],
})
export class SessionWarning implements OnInit, OnDestroy {
  showWarning = signal(false);
  timeRemaining = signal(0);

  private countdownSubscription?: Subscription;
  private readonly WARNING_DURATION = 10 * 60 * 1000; // 10 minutes

  ngOnInit(): void {
    this.startWarning(this.WARNING_DURATION);
  }

  ngOnDestroy(): void {
    this.countdownSubscription?.unsubscribe();
  }

  startWarning(duration: number): void {
    this.showWarning.set(true);
    this.timeRemaining.set(duration);

    this.countdownSubscription = timer(0, 1000).subscribe(() => {
      const remaining = this.timeRemaining() - 1000;

      if (remaining <= 0) {
        this.handleTimeout();
      } else {
        this.timeRemaining.set(remaining);
      }
    });
  }

  extendSession(): void {
    this.showWarning.set(false);
    this.countdownSubscription?.unsubscribe();
    // Trigger token refresh
    console.log('Extending session...');
  }

  logoutNow(): void {
    this.showWarning.set(false);
    // Trigger immediate logout
    console.log('Logging out...');
  }

  private handleTimeout(): void {
    this.showWarning.set(false);
    // Auto-logout when countdown reaches zero
    console.log('Session timed out, auto-logout');
  }

  formatTime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
```

**Remember Me Integration:**

```typescript
// Update to login component
export class Login {
  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false], // Add remember me checkbox
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const { email, password, rememberMe } = this.loginForm.value;

        // Configure extended session if remember me is checked
        if (rememberMe) {
          await this.authService.signInWithRememberMe(email, password);
        } else {
          await this.authService.signIn(email, password);
        }

        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        await this.router.navigateByUrl(returnUrl);
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }
}
```

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with RxJS testing utilities and Angular TestBed
**Test Location:** Test files collocated with service files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test token refresh logic, activity tracking, and session management
- **Integration Tests:** Test complete session lifecycle and user interactions
- **Timer Tests:** Test RxJS timer-based functionality with fake timers
- **Race Condition Tests:** Test concurrent operations and state consistency

**Key Test Scenarios:**

- Automatic token refresh before expiration
- Token refresh failure handling and retry logic
- Concurrent token refresh request prevention
- Session timeout warnings and user interactions
- Activity-based session extension
- "Remember Me" functionality and extended sessions
- Cross-tab session synchronization
- Network failure and service outage handling

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
