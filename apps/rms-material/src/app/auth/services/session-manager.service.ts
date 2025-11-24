import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

import { ActivityTrackingService } from './activity-tracking.service';
import { SessionRestorationService } from './session-restoration.service';
import {
  SessionTimerEvent,
  SessionTimerService,
} from './session-timer.service';
import { TokenRefreshService } from './token-refresh.service';
import {
  SessionMetadata,
  UserProfile,
  UserStateService,
} from './user-state.service';

export interface SessionConfig {
  sessionTimeoutMinutes: number;
  warningTimeMinutes: number;
  extendOnActivity: boolean;
  rememberMeEnabled: boolean;
}
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required enum for SessionManagerService
export enum SessionStatus {
  Active = 'active',
  Warning = 'warning',
  Expired = 'expired',
  Extending = 'extending',
  Refreshing = 'refreshing',
}

// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required enum for SessionManagerService
export enum SessionEventType {
  SessionStarted = 'session_started',
  SessionWarning = 'session_warning',
  SessionExtended = 'session_extended',
  SessionExpired = 'session_expired',
  TokenRefreshed = 'token_refreshed',
  TokenRefreshFailed = 'token_refresh_failed',
  ActivityDetected = 'activity_detected',
}
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required interface for SessionManagerService
export interface SessionEvent {
  type: SessionEventType;
  timestamp: Date;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Main service class with required interfaces/enums
export class SessionManagerService {
  private destroyRef = inject(DestroyRef);
  private tokenRefreshService = inject(TokenRefreshService);
  private activityTrackingService = inject(ActivityTrackingService);
  private userStateService = inject(UserStateService);
  private sessionTimerService = inject(SessionTimerService);
  private sessionRestorationService = inject(SessionRestorationService);

  private config: SessionConfig = {
    sessionTimeoutMinutes: 60,
    warningTimeMinutes: 10,
    extendOnActivity: true,
    rememberMeEnabled: true,
  };

  private sessionStatus = signal<SessionStatus>(SessionStatus.Expired);
  private sessionStartTime = signal<Date | null>(null);
  private lastExtensionTime = signal<Date | null>(null);
  private sessionEventSubject = new Subject<SessionEvent>();

  readonly status = this.sessionStatus.asReadonly();
  readonly startTime = this.sessionStartTime.asReadonly();
  readonly lastExtension = this.lastExtensionTime.asReadonly();
  readonly warningTime = this.sessionTimerService.warningTime;
  readonly expiryTime = this.sessionTimerService.expiryTime;
  readonly isActive = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed callback
    () => this.sessionStatus() === SessionStatus.Active
  );

  readonly isWarning = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed callback
    () => this.sessionStatus() === SessionStatus.Warning
  );

  readonly isExpired = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed callback
    () => this.sessionStatus() === SessionStatus.Expired
  );

  readonly isExtending = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed callback
    () => this.sessionStatus() === SessionStatus.Extending
  );

  readonly sessionDuration = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed callback
    () =>
      this.sessionStartTime()
        ? Date.now() - this.sessionStartTime()!.getTime()
        : 0
  );

  readonly sessionEvents = this.sessionEventSubject.asObservable();

  constructor() {
    this.initializeSessionManagement();
    this.setupTimerEventHandling();
  }

  startSession(profile: UserProfile, rememberMe: boolean = false): void {
    const now = new Date();
    if (rememberMe && this.config.rememberMeEnabled) {
      this.config.sessionTimeoutMinutes = 90 * 24 * 60;
    }
    this.userStateService.createSession(profile, rememberMe);
    this.sessionStartTime.set(now);
    this.lastExtensionTime.set(now);
    this.sessionStatus.set(SessionStatus.Active);

    // Start activity tracking when session begins
    this.activityTrackingService.startActivityTracking();

    this.sessionTimerService.startTimers({
      sessionTimeoutMinutes: this.config.sessionTimeoutMinutes,
      warningTimeMinutes: this.config.warningTimeMinutes,
    });
    this.tokenRefreshService.startTokenRefreshTimer();
    this.emitSessionEvent(SessionEventType.SessionStarted, {
      profile: profile.username,
      rememberMe,
      timeout: this.config.sessionTimeoutMinutes,
    });
  }

  async extendSession(): Promise<boolean> {
    if (!this.isActive() && !this.isWarning()) {
      return false;
    }
    this.sessionStatus.set(SessionStatus.Extending);
    try {
      const refreshSuccess = await this.tokenRefreshService.refreshToken();
      if (refreshSuccess) {
        const now = new Date();
        this.lastExtensionTime.set(now);
        this.sessionStatus.set(SessionStatus.Active);
        this.userStateService.updateActivity(now);
        this.sessionTimerService.startTimers({
          sessionTimeoutMinutes: this.config.sessionTimeoutMinutes,
          warningTimeMinutes: this.config.warningTimeMinutes,
        });
        this.emitSessionEvent(SessionEventType.SessionExtended, {
          extensionTime: now,
          newExpiryTime: this.sessionTimerService.calculateExpiryTime(
            this.config,
            now
          ),
        });
        return true;
      }
      this.expireSession(false);
      return false;
    } catch {
      this.expireSession(false);
      return false;
    }
  }

  expireSession(graceful: boolean = true): void {
    this.sessionStatus.set(SessionStatus.Expired);
    this.sessionTimerService.stopTimers();
    this.tokenRefreshService.stopTokenRefreshTimer();

    // Stop activity tracking when session expires
    this.activityTrackingService.stopActivityTracking();

    this.userStateService.clearState();
    this.sessionStartTime.set(null);
    this.lastExtensionTime.set(null);
    this.emitSessionEvent(SessionEventType.SessionExpired, {
      graceful,
      duration: this.sessionDuration(),
    });
  }

  configureSession(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.isActive()) {
      this.sessionTimerService.resetTimers({
        sessionTimeoutMinutes: this.config.sessionTimeoutMinutes,
        warningTimeMinutes: this.config.warningTimeMinutes,
      });
    }
  }

  getConfiguration(): Readonly<SessionConfig> {
    return { ...this.config };
  }

  getSessionStats(): {
    status: SessionStatus;
    duration: number;
    timeUntilWarning: number;
    timeUntilExpiry: number;
    activityStats: ReturnType<ActivityTrackingService['getActivityStats']>;
    tokenExpiration: Date | null;
  } {
    return {
      status: this.sessionStatus(),
      duration: this.sessionDuration(),
      timeUntilWarning: this.sessionTimerService.warningTime(),
      timeUntilExpiry: this.sessionTimerService.expiryTime(),
      activityStats: this.activityTrackingService.getActivityStats(),
      tokenExpiration: this.tokenRefreshService.getTokenExpiration(),
    };
  }

  shouldShowWarning(): boolean {
    return this.sessionStatus() === SessionStatus.Warning;
  }

  isRememberMeSession(): boolean {
    const session = this.userStateService.session();
    return session?.rememberMe ?? false;
  }

  private initializeSessionManagement(): void {
    // Set up activity callback without starting tracking yet
    this.activityTrackingService.onActivity(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Activity callback
      (activityTime: Date) => {
        this.handleUserActivity(activityTime);
      }
    );

    const userState = this.userStateService.getUserState();
    if (userState.isAuthenticated && userState.session) {
      this.restoreSession(userState.session);
    }
  }

  private setupTimerEventHandling(): void {
    this.sessionTimerService.timerEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- Event subscription callback
        (event) => {
          if (event.event === SessionTimerEvent.Warning) {
            this.handleTimerWarning(event.data);
          } else if (event.event === SessionTimerEvent.Expired) {
            this.handleTimerExpired();
          }
        }
      );
  }

  private handleTimerWarning(data?: unknown): void {
    if (this.sessionStatus() === SessionStatus.Active) {
      this.sessionStatus.set(SessionStatus.Warning);
      this.emitSessionEvent(SessionEventType.SessionWarning, {
        warningDuration: this.config.warningTimeMinutes * 60 * 1000,
        expiryTime: this.sessionTimerService.calculateExpiryTime(
          this.config,
          this.sessionStartTime() ?? new Date()
        ),
        ...(data !== null && data !== undefined && typeof data === 'object'
          ? data
          : {}),
      });
    }
  }

  private handleTimerExpired(): void {
    this.expireSession(false); // Automatic expiry
  }

  private handleUserActivity(activityTime: Date): void {
    this.userStateService.updateActivity(activityTime);

    if (
      this.config.extendOnActivity &&
      this.sessionStatus() === SessionStatus.Warning
    ) {
      void this.extendSession();
    }

    this.emitSessionEvent(SessionEventType.ActivityDetected, {
      activityTime,
      sessionStatus: this.sessionStatus(),
    });
  }

  private restoreSession(sessionMetadata: SessionMetadata): void {
    const restorationResult =
      this.sessionRestorationService.determineRestorationStatus(
        sessionMetadata,
        this.config
      );

    if (restorationResult.status === SessionStatus.Expired) {
      this.expireSession();
      return;
    }

    this.sessionStartTime.set(sessionMetadata.loginTime);
    this.lastExtensionTime.set(sessionMetadata.lastActivity);
    this.sessionStatus.set(restorationResult.status);

    // Start activity tracking for restored session
    this.activityTrackingService.startActivityTracking();

    if (restorationResult.shouldStartTimers) {
      this.sessionTimerService.startTimers({
        sessionTimeoutMinutes: this.config.sessionTimeoutMinutes,
        warningTimeMinutes: this.config.warningTimeMinutes,
      });
    }

    if (restorationResult.shouldShowWarning) {
      this.handleTimerWarning();
    }

    this.tokenRefreshService.startTokenRefreshTimer();
  }

  private emitSessionEvent(type: SessionEventType, data?: unknown): void {
    const event: SessionEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    this.sessionEventSubject.next(event);
  }
}
