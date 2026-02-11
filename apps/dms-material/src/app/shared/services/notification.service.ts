import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { NotificationSeverity } from '../types/notification-severity.type';

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
      panelClass: [`snackbar-${severity}`, `notification-${severity}`],
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

  showPersistent(
    message: string,
    severity: NotificationSeverity = 'info'
  ): void {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: 0,
      panelClass: [`snackbar-${severity}`, `notification-${severity}`],
    };
    this.snackBar.open(message, 'Dismiss', config);
  }
}
