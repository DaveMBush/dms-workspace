import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { SplitterComponent } from '../shared/components/splitter/splitter.component';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';
import { GlobalLoadingService } from '../shared/services/global-loading.service';
import { ThemeService } from '../shared/services/theme.service';

@Component({
  selector: 'dms-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
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
  private globalLoading = inject(GlobalLoadingService);

  protected themeService = inject(ThemeService);
  protected isDarkMode = this.themeService.isDarkMode$;
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for lexical this binding
  protected darkModeIcon$ = computed(() => {
    return this.isDarkMode() ? 'light_mode' : 'dark_mode';
  });

  // Global loading signals for template
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for proper this binding
  protected isLoading = computed(() => this.globalLoading.isLoading());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for proper this binding
  protected loadingMessage = computed(() => this.globalLoading.message());

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
