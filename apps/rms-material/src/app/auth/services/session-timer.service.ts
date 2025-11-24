import { Injectable, signal } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';

export interface SessionTimerConfig {
  sessionTimeoutMinutes: number;
  warningTimeMinutes: number;
}

// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required enum for SessionTimerService
export enum SessionTimerEvent {
  Warning = 'warning',
  Expired = 'expired',
}

@Injectable({ providedIn: 'root' })
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Main service class with required interfaces/enums
export class SessionTimerService {
  // Timer state signals
  private timeUntilWarning = signal<number>(0);
  private timeUntilExpiry = signal<number>(0);
  private isTimerActive = signal<boolean>(false);

  // Timer instances
  private warningTimer?: Observable<number>;
  private expiryTimer?: Observable<number>;
  private timerSubscription?: { unsubscribe(): void };

  // Event subject
  private timerEventSubject = new Subject<{
    event: SessionTimerEvent;
    data?: unknown;
  }>();

  // Public readonly signals
  readonly warningTime = this.timeUntilWarning.asReadonly();
  readonly expiryTime = this.timeUntilExpiry.asReadonly();
  readonly active = this.isTimerActive.asReadonly();

  // Public observables
  readonly timerEvents = this.timerEventSubject.asObservable();

  /**
   * Start session timers based on configuration
   */
  startTimers(config: SessionTimerConfig): void {
    this.stopTimers();

    const sessionTimeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    const warningTimeMs = config.warningTimeMinutes * 60 * 1000;
    const timeUntilWarning = sessionTimeoutMs - warningTimeMs;

    this.isTimerActive.set(true);
    this.updateTimeRemaining(config, new Date());

    // Start warning timer
    if (timeUntilWarning > 0) {
      this.warningTimer = timer(timeUntilWarning);
      this.timerSubscription = this.warningTimer.subscribe(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- Timer callback
        () => {
          this.handleWarningTimeout(config);
        }
      );
    } else {
      // Warning time is longer than session timeout, show warning immediately
      this.handleWarningTimeout(config);
    }
  }

  /**
   * Stop all active timers
   */
  stopTimers(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }

    this.isTimerActive.set(false);
    this.timeUntilWarning.set(0);
    this.timeUntilExpiry.set(0);
  }

  /**
   * Reset timers with new configuration
   */
  resetTimers(config: SessionTimerConfig): void {
    if (this.isTimerActive()) {
      this.startTimers(config);
    }
  }

  /**
   * Check if timers are currently active
   */
  areTimersActive(): boolean {
    return this.isTimerActive();
  }

  /**
   * Calculate expiry time based on configuration and start time
   */
  calculateExpiryTime(config: SessionTimerConfig, sessionStart: Date): Date {
    const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    return new Date(sessionStart.getTime() + timeoutMs);
  }

  /**
   * Update time remaining signals
   */
  updateTimeRemaining(config: SessionTimerConfig, sessionStart: Date): void {
    const expiryTime = this.calculateExpiryTime(config, sessionStart);
    const warningTimeMs = config.warningTimeMinutes * 60 * 1000;
    const now = Date.now();

    this.timeUntilExpiry.set(Math.max(0, expiryTime.getTime() - now));
    this.timeUntilWarning.set(
      Math.max(0, expiryTime.getTime() - now - warningTimeMs)
    );
  }

  /**
   * Handle warning timeout
   */
  private handleWarningTimeout(config: SessionTimerConfig): void {
    // Emit warning event
    this.timerEventSubject.next({
      event: SessionTimerEvent.Warning,
      data: {
        warningDuration: config.warningTimeMinutes * 60 * 1000,
      },
    });

    // Start expiry timer
    const warningTimeMs = config.warningTimeMinutes * 60 * 1000;
    this.expiryTimer = timer(warningTimeMs);

    this.timerSubscription = this.expiryTimer.subscribe(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Timer callback
      () => {
        this.handleExpiryTimeout();
      }
    );
  }

  /**
   * Handle expiry timeout
   */
  private handleExpiryTimeout(): void {
    this.timerEventSubject.next({
      event: SessionTimerEvent.Expired,
    });

    this.stopTimers();
  }
}
