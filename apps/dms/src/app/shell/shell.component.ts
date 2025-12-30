import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PanelModule } from 'primeng/panel';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../auth/auth.service';
import { GlobalComponent } from '../global/global.component';
import { BaseRouteComponent } from '../shared/base-route-component';

const DARK_MODE_KEY = 'dms-dark';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    PanelModule,
    RouterModule,
    ToolbarModule,
    SplitterModule,
    TooltipModule,
    GlobalComponent,
  ],
  providers: [ConfirmationService],
  selector: 'dms-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent extends BaseRouteComponent {
  constructor() {
    super();
    const authService = inject(AuthService);
    this.authService = authService;

    this.confirmationService = inject(ConfirmationService);
  }

  private authService!: AuthService;
  private confirmationService!: ConfirmationService;

  themeIcon = 'pi-moon';
  themeTooltip = 'Dark Mode';
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  selectedId: string | null = null;

  // Authentication computed signals
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
  private currentUserComputed = computed(() => this.authService.currentUser());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
  isAuthenticated$ = computed(() => this.authService.isAuthenticated());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
  authLoading = computed(() => this.authService.isLoading());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
  getUserDisplayName$ = computed(() => {
    const user = this.currentUserComputed();
    return user?.email ?? 'User';
  });

  override ngOnInit(): void {
    if (this.isBrowser) {
      if (document.readyState === 'complete') {
        this.afterPageLoad();
      } else {
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
        window.addEventListener('load', () => {
          this.afterPageLoad();
        });
      }
    }

    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  updateSelectionFromRoute(url: string): void {
    const globalMatch = /\/global\/([^/]+)/.exec(url);
    const globalId = globalMatch?.[1];

    if (globalId !== undefined && globalId !== '') {
      this.selectedId = globalId;
    } else {
      // Clear selection if not on a global route
      this.selectedId = null;
    }
  }

  protected toggleTheme(): void {
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    document.querySelector('html')?.classList.toggle('p-dark', !isDark);
    localStorage.setItem(DARK_MODE_KEY, !isDark ? 'true' : 'false');
    this.themeIcon = !isDark ? 'pi-sun' : 'pi-moon';
    this.themeTooltip = !isDark ? 'Light Mode' : 'Dark Mode';
  }

  protected onSelectionChange(e: { id: string; name: string }): void {
    this.selectedId = e.id;
  }

  protected logout(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to sign out?',
      header: 'Confirm Sign Out',
      icon: 'pi pi-sign-out',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Yes, Sign Out',
      rejectLabel: 'Cancel',
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
      accept: async () => {
        try {
          await this.authService.signOut();
        } catch {
          // AuthService handles the logout even on error
        }
      },
    });
  }

  private afterPageLoad(): void {
    let darkValue = localStorage.getItem(DARK_MODE_KEY);
    if (darkValue === null) {
      // find the system preference for dark mode
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem(DARK_MODE_KEY, isDark ? 'true' : 'false');
      darkValue = isDark ? 'true' : 'false';
    }

    if (darkValue === 'true') {
      this.themeIcon = 'pi-sun';
      this.themeTooltip = 'Light Mode';
      document.querySelector('html')?.classList.toggle('p-dark', true);
    }
  }
}
