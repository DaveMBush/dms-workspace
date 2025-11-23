# Story AB.4: Migrate Session Warning Dialog

## Story

**As a** logged-in user
**I want** to see a warning before my session expires
**So that** I can extend my session and avoid losing work

## Context

**Current System:**

- Location: `apps/rms/src/app/auth/components/session-warning/`
- Uses `p-dialog` for modal display
- Shows countdown timer
- Allows extending session or logging out

**Migration Target:**

- Use `MatDialog` service for modal
- Same countdown functionality
- Same extend/logout actions

## Acceptance Criteria

### Functional Requirements

- [ ] Dialog appears before session timeout
- [ ] Countdown timer displays remaining time
- [ ] "Extend Session" button extends session
- [ ] "Logout" button ends session
- [ ] Dialog closes on action
- [ ] Session actually extends/ends based on action

### Technical Requirements

- [ ] Component uses `MatDialogRef` for dialog control
- [ ] Dialog opened via `MatDialog` service
- [ ] Timer uses RxJS interval or signals
- [ ] Auth service integration for extend/logout

### Visual Requirements

- [ ] Centered modal with backdrop
- [ ] Clear warning styling
- [ ] Visible countdown
- [ ] Prominent action buttons

## Technical Approach

### Step 1: Create Session Warning Dialog Component

Create `apps/rms-material/src/app/auth/components/session-warning/session-warning.ts`:

```typescript
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
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
})
export class SessionWarning implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<SessionWarning>);
  private authService = inject(AuthService);
  private timerSubscription: Subscription | null = null;

  // Warning shows 60 seconds before timeout
  private readonly WARNING_SECONDS = 60;

  secondsRemaining = signal(this.WARNING_SECONDS);
  progressValue = signal(100);

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    const context = this;
    this.timerSubscription = interval(1000)
      .pipe(takeWhile(function checkRemaining() {
        return context.secondsRemaining() > 0;
      }))
      .subscribe(function onTick() {
        const remaining = context.secondsRemaining() - 1;
        context.secondsRemaining.set(remaining);
        context.progressValue.set((remaining / context.WARNING_SECONDS) * 100);

        if (remaining <= 0) {
          context.onLogout();
        }
      });
  }

  private stopCountdown(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  async onExtendSession(): Promise<void> {
    try {
      await this.authService.refreshSession();
      this.dialogRef.close('extended');
    } catch (error) {
      console.error('Failed to extend session:', error);
      this.onLogout();
    }
  }

  onLogout(): void {
    this.stopCountdown();
    this.authService.logout();
    this.dialogRef.close('logout');
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
```

### Step 2: Create Session Warning Template

Create `apps/rms-material/src/app/auth/components/session-warning/session-warning.html`:

```html
<h2 mat-dialog-title class="warning-title">
  <mat-icon color="warn">warning</mat-icon>
  Session Expiring Soon
</h2>

<mat-dialog-content>
  <p class="warning-message">
    Your session will expire in <strong>{{ formatTime(secondsRemaining()) }}</strong>.
  </p>
  <p class="warning-subtext">
    Would you like to extend your session or log out?
  </p>

  <mat-progress-bar
    mode="determinate"
    [value]="progressValue()"
    color="warn"
  ></mat-progress-bar>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button color="warn" (click)="onLogout()">
    <mat-icon>logout</mat-icon>
    Logout Now
  </button>
  <button mat-raised-button color="primary" (click)="onExtendSession()">
    <mat-icon>refresh</mat-icon>
    Extend Session
  </button>
</mat-dialog-actions>
```

### Step 3: Create Session Warning Styles

Create `apps/rms-material/src/app/auth/components/session-warning/session-warning.scss`:

```scss
.warning-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  mat-icon {
    font-size: 28px;
    width: 28px;
    height: 28px;
  }
}

.warning-message {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;

  strong {
    font-size: 1.3rem;
    color: var(--rms-error);
  }
}

.warning-subtext {
  color: var(--rms-text-secondary);
  margin-bottom: 1rem;
}

mat-progress-bar {
  margin-top: 1rem;
}

mat-dialog-actions {
  button {
    mat-icon {
      margin-right: 0.25rem;
    }
  }
}
```

### Step 4: Create Session Warning Service

Create `apps/rms-material/src/app/auth/services/session-warning.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { SessionWarning } from '../components/session-warning/session-warning';

@Injectable({
  providedIn: 'root',
})
export class SessionWarningService {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private dialogRef: MatDialogRef<SessionWarning> | null = null;

  showWarning(): void {
    if (this.dialogRef) {
      return; // Already showing
    }

    this.dialogRef = this.dialog.open(SessionWarning, {
      width: '400px',
      disableClose: true,
      panelClass: 'session-warning-dialog',
    });

    const context = this;
    this.dialogRef.afterClosed().subscribe(function onClose(result: string) {
      context.dialogRef = null;
      if (result === 'logout') {
        context.router.navigate(['/auth/login']);
      }
    });
  }

  hideWarning(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }
}
```

### Step 5: Integrate with Auth Service

The auth service should call `sessionWarningService.showWarning()` when session is about to expire. This integration depends on the existing auth service implementation - the warning service just needs to be injected and called at the appropriate time.

## Files Created

| File | Purpose |
|------|---------|
| `auth/components/session-warning/session-warning.ts` | Session warning dialog |
| `auth/components/session-warning/session-warning.html` | Dialog template |
| `auth/components/session-warning/session-warning.scss` | Dialog styles |
| `auth/services/session-warning.service.ts` | Service to show/hide warning |

## Definition of Done

- [ ] Session warning dialog component created
- [ ] Countdown timer works correctly
- [ ] Progress bar reflects time remaining
- [ ] Extend session button calls auth service
- [ ] Logout button ends session and navigates to login
- [ ] Dialog cannot be closed without action (disableClose)
- [ ] Auto-logout when timer reaches zero
- [ ] SessionWarningService can show/hide dialog
- [ ] Integration with auth service timer
- [ ] All validation commands pass
