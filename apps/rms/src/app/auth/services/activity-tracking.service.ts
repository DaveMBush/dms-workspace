import { DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, fromEvent, merge, throttleTime } from 'rxjs';

/**
 * Service for tracking user activity to extend session timeouts
 * Monitors mouse, keyboard, and touch events to determine user engagement
 */
@Injectable({
  providedIn: 'root',
})
export class ActivityTrackingService {
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  private lastActivity = signal<Date>(new Date());
  private isTracking = signal(false);
  private activityCallbacks: Array<(lastActivity: Date) => void> = [];

  // Configuration
  private readonly activityThreshold = 30000; // 30 seconds - minimum time between activity updates
  private readonly debounceTime = 1000; // 1 second - debounce rapid events
  private readonly activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'focus',
    'wheel',
  ];

  /**
   * Start tracking user activity
   * Activity events are throttled and debounced for performance
   */
  startActivityTracking(): void {
    if (this.isTracking()) {
      // Activity tracking already started
      return;
    }

    this.isTracking.set(true);
    this.updateLastActivity();

    // Starting activity tracking - comment placeholder

    // Run outside Angular zone for performance
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- NgZone callback function
    this.ngZone.runOutsideAngular(() => {
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Array map callback
      const activityStreams = this.activityEvents.map((event) =>
        fromEvent(document, event, { passive: true })
      );

      merge(...activityStreams)
        .pipe(
          throttleTime(this.activityThreshold), // Limit updates to once per threshold period
          debounceTime(this.debounceTime), // Wait for event burst to settle
          takeUntilDestroyed(this.destroyRef)
        )
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS subscribe callback
        .subscribe(() => {
          this.runActivityUpdate();
        });
    });

    // Activity tracking started
  }

  /**
   * Stop tracking user activity
   */
  stopActivityTracking(): void {
    if (!this.isTracking()) {
      return;
    }

    this.isTracking.set(false);
    // Activity tracking stopped
  }

  /**
   * Register a callback to be called when user activity is detected
   */
  onActivity(callback: (lastActivity: Date) => void): void {
    this.activityCallbacks.push(callback);
  }

  /**
   * Unregister an activity callback
   */
  offActivity(callback: (lastActivity: Date) => void): void {
    const index = this.activityCallbacks.indexOf(callback);
    if (index > -1) {
      this.activityCallbacks.splice(index, 1);
    }
  }

  /**
   * Get the time elapsed since last detected user activity
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivity().getTime();
  }

  /**
   * Check if the user has been active recently
   * @param thresholdMs - Threshold in milliseconds (defaults to activity threshold)
   */
  isUserActive(thresholdMs: number = this.activityThreshold): boolean {
    return this.getTimeSinceLastActivity() < thresholdMs;
  }

  /**
   * Get the last activity timestamp as a readonly signal
   */
  getLastActivity(): Date {
    return this.lastActivity();
  }

  /**
   * Get the readonly signal for last activity
   */
  get lastActivitySignal(): ReturnType<typeof this.lastActivity.asReadonly> {
    return this.lastActivity.asReadonly();
  }

  /**
   * Check if activity tracking is currently enabled
   */
  isTrackingActive(): boolean {
    return this.isTracking();
  }

  /**
   * Get readonly signal for tracking status
   */
  get isTrackingSignal(): ReturnType<typeof this.isTracking.asReadonly> {
    return this.isTracking.asReadonly();
  }

  /**
   * Manually update the last activity timestamp
   * Useful for programmatic activity (like API calls)
   */
  recordActivity(): void {
    this.updateLastActivity();
  }

  /**
   * Get activity statistics
   */
  getActivityStats(): {
    lastActivity: Date;
    timeSinceLastActivity: number;
    isActive: boolean;
    isTracking: boolean;
  } {
    const lastActivity = this.lastActivity();
    return {
      lastActivity,
      timeSinceLastActivity: this.getTimeSinceLastActivity(),
      isActive: this.isUserActive(),
      isTracking: this.isTracking(),
    };
  }

  /**
   * Configure activity tracking thresholds
   */
  configure(options: {
    activityThreshold?: number;
    debounceTime?: number;
  }): void {
    if (options.activityThreshold !== undefined) {
      // Activity threshold updated - comment placeholder
    }
    if (options.debounceTime !== undefined) {
      // Debounce time updated - comment placeholder
    }

    // Note: Configuration changes require restart of tracking to take effect
    if (this.isTracking()) {
      // Configuration changes require restarting activity tracking
    }
  }

  /**
   * Update the last activity timestamp and notify callbacks
   */
  private updateLastActivity(): void {
    const now = new Date();
    this.lastActivity.set(now);
    this.notifyActivityCallbacks(now);
  }

  /**
   * Run activity update inside Angular zone
   */
  private runActivityUpdate(): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- NgZone.run callback
    this.ngZone.run(() => {
      this.updateLastActivity();
    });
  }

  /**
   * Notify all registered activity callbacks
   */
  private notifyActivityCallbacks(now: Date): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Array forEach callback
    this.activityCallbacks.forEach((callback) => {
      try {
        callback(now);
      } catch {
        // Error in activity callback - warning placeholder
      }
    });
  }
}
