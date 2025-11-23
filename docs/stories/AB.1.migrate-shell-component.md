# Story AB.1: Migrate Shell Component

## Story

**As a** user of the rms-material application
**I want** the main application shell with toolbar, navigation, and layout
**So that** I can navigate the application and access all features

## Context

**Current System:**

- Location: `apps/rms/src/app/shell/shell.component.ts`
- PrimeNG components used:
  - `p-toolbar` - Top navigation bar
  - `p-splitter` - Resizable split layout
  - `p-confirmDialog` - Confirmation dialogs
  - `p-toast` - Toast notifications
  - `p-button` - Action buttons

**Migration Target:**

- `mat-toolbar` - Top navigation bar
- Custom splitter component using CDK
- `MatDialog` service for confirmations
- `MatSnackBar` for notifications
- `mat-button`, `mat-icon-button` - Action buttons

## Acceptance Criteria

### Functional Requirements

- [ ] Toolbar displays with logo/title and navigation actions
- [ ] Theme toggle button in toolbar switches light/dark mode
- [ ] User menu with profile and logout options
- [ ] Splitter layout with accounts panel (left) and content area (right)
- [ ] Splitter resizable with drag handle
- [ ] Splitter state persisted in localStorage
- [ ] Toast notifications display correctly
- [ ] Confirmation dialogs work correctly

### Technical Requirements

- [ ] `mat-toolbar` used for header
- [ ] Custom `SplitterComponent` created using CDK
- [ ] `NotificationService` wrapping `MatSnackBar` created
- [ ] `ConfirmDialogService` wrapping `MatDialog` created
- [ ] Router outlet for main content
- [ ] Named router outlet for accounts panel

### Visual Requirements

- [ ] Toolbar height matches current design (~64px)
- [ ] Splitter divider visible and draggable
- [ ] Proper spacing and alignment
- [ ] Icons display correctly

### Validation Requirements

- [ ] All child routes render in content area
- [ ] Account selection navigates correctly
- [ ] Logout clears session and redirects
- [ ] All validation commands pass

## Technical Approach

### Step 1: Create Notification Service

Create `apps/rms-material/src/app/shared/services/notification.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'end',
    verticalPosition: 'top',
  };

  show(message: string, severity: NotificationSeverity = 'info'): void {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      panelClass: [`snackbar-${severity}`],
    };
    this.snackBar.open(message, 'Close', config);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warn(message: string): void {
    this.show(message, 'warn');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  showPersistent(message: string, severity: NotificationSeverity = 'info'): void {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: 0, // Persistent until dismissed
      panelClass: [`snackbar-${severity}`],
    };
    this.snackBar.open(message, 'Dismiss', config);
  }
}
```

### Step 2: Create Confirm Dialog Component

Create `apps/rms-material/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'rms-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button mat-raised-button color="primary" (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
```

### Step 3: Create Confirm Dialog Service

Create `apps/rms-material/src/app/shared/services/confirm-dialog.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data,
    });
    return dialogRef.afterClosed();
  }
}
```

### Step 4: Create Custom Splitter Component

Create `apps/rms-material/src/app/shared/components/splitter/splitter.component.ts`:

```typescript
import { Component, input, output, signal, effect } from '@angular/core';
import { CdkDrag, CdkDragMove } from '@angular/cdk/drag-drop';

@Component({
  selector: 'rms-splitter',
  imports: [CdkDrag],
  template: `
    <div class="splitter-container" #container>
      <div class="splitter-panel left-panel" [style.width.%]="leftWidth()">
        <ng-content select="[leftPanel]"></ng-content>
      </div>
      <div
        class="splitter-handle"
        cdkDrag
        cdkDragLockAxis="x"
        (cdkDragMoved)="onDragMove($event, container)"
      >
        <div class="handle-bar"></div>
      </div>
      <div class="splitter-panel right-panel" [style.width.%]="100 - leftWidth()">
        <ng-content select="[rightPanel]"></ng-content>
      </div>
    </div>
  `,
  styleUrl: './splitter.component.scss',
})
export class SplitterComponent {
  stateKey = input<string>('splitter-state');
  initialLeftWidth = input<number>(20);

  leftWidth = signal(this.loadState() ?? this.initialLeftWidth());
  widthChange = output<number>();

  constructor() {
    effect(() => {
      this.saveState(this.leftWidth());
    });
  }

  onDragMove(event: CdkDragMove, container: HTMLElement): void {
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((event.pointerPosition.x - containerRect.left) / containerRect.width) * 100;
    const clampedWidth = Math.max(10, Math.min(50, newLeftWidth));
    this.leftWidth.set(clampedWidth);
    this.widthChange.emit(clampedWidth);
  }

  private loadState(): number | null {
    const stored = localStorage.getItem(this.stateKey());
    return stored ? parseFloat(stored) : null;
  }

  private saveState(width: number): void {
    localStorage.setItem(this.stateKey(), width.toString());
  }
}
```

### Step 5: Migrate Shell Component

Create `apps/rms-material/src/app/shell/shell.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../shared/services/theme.service';
import { SplitterComponent } from '../shared/components/splitter/splitter.component';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';

@Component({
  selector: 'rms-shell',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    SplitterComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);

  themeService = inject(ThemeService);

  onLogout(): void {
    this.confirmDialog
      .confirm({
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out?',
        confirmText: 'Logout',
        cancelText: 'Cancel',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        }
      });
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
```

### Step 6: Create Shell Template

Create `apps/rms-material/src/app/shell/shell.component.html`:

```html
<mat-toolbar color="primary" class="shell-toolbar">
  <span class="app-title">RMS</span>

  <span class="toolbar-spacer"></span>

  <button mat-icon-button (click)="themeService.toggleTheme()" aria-label="Toggle theme">
    <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
  </button>

  <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
    <mat-icon>account_circle</mat-icon>
  </button>

  <mat-menu #userMenu="matMenu">
    <button mat-menu-item (click)="navigateToProfile()">
      <mat-icon>person</mat-icon>
      <span>Profile</span>
    </button>
    <button mat-menu-item (click)="onLogout()">
      <mat-icon>logout</mat-icon>
      <span>Logout</span>
    </button>
  </mat-menu>
</mat-toolbar>

<rms-splitter stateKey="rms-main-splitter" [initialLeftWidth]="20">
  <div leftPanel class="accounts-panel">
    <router-outlet name="accounts"></router-outlet>
  </div>
  <div rightPanel class="content-panel">
    <router-outlet></router-outlet>
  </div>
</rms-splitter>
```

### Step 7: Update Routes

Update `apps/rms-material/src/app/app.routes.ts` to include shell route with guards.

## Files Created

| File | Purpose |
|------|---------|
| `shared/services/notification.service.ts` | Toast notification wrapper |
| `shared/components/confirm-dialog/confirm-dialog.component.ts` | Confirm dialog |
| `shared/services/confirm-dialog.service.ts` | Confirm dialog service |
| `shared/components/splitter/splitter.component.ts` | Custom splitter |
| `shared/components/splitter/splitter.component.scss` | Splitter styles |
| `shell/shell.component.ts` | Main shell component |
| `shell/shell.component.html` | Shell template |
| `shell/shell.component.scss` | Shell styles |

## Definition of Done

- [ ] Toolbar displays with all actions
- [ ] Theme toggle works
- [ ] User menu opens with profile/logout
- [ ] Splitter layout functional
- [ ] Splitter persists state
- [ ] Notification service working
- [ ] Confirm dialog service working
- [ ] Router outlets rendering correctly
- [ ] All validation commands pass
