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
    if (this.dialogRef !== null) {
      return;
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
        void context.router.navigate(['/auth/login']);
      }
    });
  }

  hideWarning(): void {
    if (this.dialogRef !== null) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }
}
