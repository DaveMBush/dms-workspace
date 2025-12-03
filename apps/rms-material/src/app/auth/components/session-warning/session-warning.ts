import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

import { AuthService } from '../../auth.service';

@Component({
  selector: 'rms-session-warning',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './session-warning.html',
  styleUrl: './session-warning.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWarning implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<SessionWarning>);
  private authService = inject(AuthService);
  private timerSubscription: Subscription | null = null;

  private readonly warningSeconds = 60;

  secondsRemaining = signal(this.warningSeconds);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires lexical this binding
  formattedTime = computed(() => {
    return this.formatTime(this.secondsRemaining());
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires lexical this binding
  progressValue = computed(() => {
    return (this.secondsRemaining() / this.warningSeconds) * 100;
  });

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  async onExtendSession(): Promise<void> {
    try {
      await this.authService.refreshTokens();
      this.dialogRef.close('extended');
    } catch {
      this.onLogout();
    }
  }

  onLogout(): void {
    this.stopCountdown();
    void this.authService.signOut();
    this.dialogRef.close('logout');
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private startCountdown(): void {
    const context = this;
    this.timerSubscription = interval(1000)
      .pipe(
        takeWhile(function checkRemaining(value) {
          return context.secondsRemaining() > 0 && value >= 0;
        })
      )
      .subscribe(function onTick() {
        const remaining = context.secondsRemaining() - 1;
        context.secondsRemaining.set(remaining);

        if (remaining <= 0) {
          context.onLogout();
        }
      });
  }

  private stopCountdown(): void {
    if (this.timerSubscription !== null) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }
}
