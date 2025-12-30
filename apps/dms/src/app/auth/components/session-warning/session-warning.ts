import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { Subscription, timer } from 'rxjs';

/**
 * Session warning component that displays countdown timer before automatic logout
 * Shows dialog with option to extend session or logout immediately
 */
@Component({
  selector: 'dms-session-warning',
  imports: [CommonModule, DialogModule, ButtonModule, ProgressBarModule],
  templateUrl: './session-warning.html',
  styleUrls: ['./session-warning.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWarning implements OnInit, OnDestroy {
  // Input properties
  warningDuration = input<number>(10 * 60 * 1000); // 10 minutes default
  enableSound = input<boolean>(false);
  showSessionInfo = input<boolean>(true);
  autoStart = input<boolean>(false);
  sessionStartTime = input<Date | null>(null);
  lastActivityTime = input<Date | null>(null);

  // Output events
  readonly extendSession = output();
  readonly logoutNow = output();
  readonly sessionExpired = output();
  readonly warningShown = output();
  readonly warningDismissed = output();

  // Component state
  showWarning = signal(false);
  timeRemaining = signal(0);
  extendingSession = signal(false);
  isActive = signal(false);

  // Computed properties
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed function requires arrow function for proper this binding
  progressPercentage = computed(() => {
    const remaining = this.timeRemaining();
    const total = this.warningDuration();
    return total > 0 ? Math.round((remaining / total) * 100) : 0;
  });

  // Getter properties for template - avoid function calls in templates
  get progressValue(): number {
    return this.progressPercentage();
  }

  get formattedTime(): string {
    return this.formatTime(this.timeRemaining());
  }

  get showSessionInfoValue(): boolean {
    return this.showSessionInfo();
  }

  get sessionStartValue(): Date | null {
    return this.sessionStartTime();
  }

  get lastActivityValue(): Date | null {
    return this.lastActivityTime();
  }

  get enableSoundValue(): boolean {
    return this.enableSound();
  }

  get isExtendingSessionValue(): boolean {
    return this.extendingSession();
  }

  // Private properties
  private countdownSubscription?: Subscription;
  private readonly countdownInterval = 1000; // 1 second

  ngOnInit(): void {
    if (this.autoStart()) {
      this.startWarning();
    }
  }

  ngOnDestroy(): void {
    this.stopWarning();
  }

  /**
   * Start the session warning countdown
   */
  startWarning(duration?: number): void {
    const warningDuration = duration ?? this.warningDuration();

    if (warningDuration <= 0) {
      // Invalid warning duration - skip warning
      return;
    }

    this.stopWarning(); // Stop any existing countdown

    this.showWarning.set(true);
    this.timeRemaining.set(warningDuration);
    this.isActive.set(true);
    this.extendingSession.set(false);

    // Play sound notification if enabled
    if (this.enableSound()) {
      this.playWarningSound();
    }

    // Start countdown timer
    this.countdownSubscription = timer(0, this.countdownInterval).subscribe(
      this.handleCountdownTick.bind(this)
    );

    this.warningShown.emit();
    // Session warning started successfully
  }

  /**
   * Stop the session warning countdown
   */
  stopWarning(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = undefined;
    }

    if (this.isActive()) {
      this.showWarning.set(false);
      this.isActive.set(false);
      this.warningDismissed.emit();
      // Session warning stopped successfully
    }
  }

  /**
   * Handle extend session button click
   */
  onExtendSession(): void {
    if (this.extendingSession()) {
      return;
    }

    this.extendingSession.set(true);

    // Emit extend session event
    this.extendSession.emit();

    // Stop the warning countdown
    this.stopWarning();

    // Session extension requested successfully

    // Reset extending state after a delay (in case parent doesn't handle it)
    setTimeout(this.resetExtendingState.bind(this), 3000);
  }

  /**
   * Handle logout now button click
   */
  onLogoutNow(): void {
    this.stopWarning();
    this.logoutNow.emit();
    // Immediate logout requested successfully
  }

  /**
   * Format time remaining as MM:SS
   */
  formatTime(milliseconds: number): string {
    if (milliseconds <= 0) {
      return '00:00';
    }

    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  /**
   * Check if warning is currently active
   */
  isWarningActive(): boolean {
    return this.isActive();
  }

  /**
   * Get current warning state
   */
  getWarningState(): {
    isActive: boolean;
    timeRemaining: number;
    progressPercentage: number;
    isExtending: boolean;
  } {
    return {
      isActive: this.isActive(),
      timeRemaining: this.timeRemaining(),
      progressPercentage: this.progressPercentage(),
      isExtending: this.extendingSession(),
    };
  }

  /**
   * Manually set extending state (for parent components)
   */
  setExtendingState(extending: boolean): void {
    this.extendingSession.set(extending);
  }

  /**
   * Update session times (for real-time display)
   */
  updateSessionTimes(_: Date, __: Date): void {
    // These would be handled through inputs in a real implementation
    // This method is for programmatic updates if needed
    // Session times updated successfully
  }

  /**
   * Reset extending state
   */
  private resetExtendingState(): void {
    this.extendingSession.set(false);
  }

  /**
   * Handle countdown tick
   */
  private handleCountdownTick(): void {
    const remaining = this.timeRemaining() - this.countdownInterval;

    if (remaining <= 0) {
      this.handleTimeout();
    } else {
      this.timeRemaining.set(remaining);
    }
  }

  /**
   * Handle session timeout (countdown reached zero)
   */
  private handleTimeout(): void {
    this.stopWarning();
    this.sessionExpired.emit();
    // Session timeout - automatic logout triggered
  }

  /**
   * Play warning sound notification
   */
  private playWarningSound(): void {
    try {
      // In a real implementation, you would reference the audio element
      // and play the sound. Audio playback not implemented yet.
      // Example implementation:
      // const audio = this.warningSound?.nativeElement;
      // if (audio) {
      //   audio.play().catch(error => {
      //     // Failed to play warning sound
      //   });
      // }
    } catch {
      // Failed to play warning sound - continue without audio
    }
  }
}
