import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { SplitterComponent } from '../shared/components/splitter/splitter.component';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';
import { ThemeService } from '../shared/services/theme.service';

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
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);

  protected themeService = inject(ThemeService);
  protected isDarkMode = this.themeService.isDarkMode$;
  protected darkModeIcon = computed(function computeDarkModeIcon(
    this: ShellComponent
  ) {
    return this.isDarkMode() ? 'light_mode' : 'dark_mode';
  });

  onLogout(): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out?',
        confirmText: 'Logout',
        cancelText: 'Cancel',
      })
      .subscribe(function handleConfirmation(confirmed) {
        if (confirmed) {
          context.authService.signOut().catch(function handleSignOutError() {
            // Silently fail signout - user will be redirected anyway
          });
          context.router
            .navigate(['/auth/login'])
            .catch(function handleError() {
              // Navigation errors are handled by router
            });
        }
      });
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']).catch(function handleError() {
      // Navigation errors are handled by router
    });
  }
}
