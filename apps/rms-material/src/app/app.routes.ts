import { Route } from '@angular/router';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

import { authGuard } from './auth/guards/auth.guard';
import { ShellComponent } from './shell/shell.component';
import { accountsDefinition } from './store/accounts/accounts-definition.const';
import { screenDefinition } from './store/screen/screen-definition.const';
import { topDefinition } from './store/top/top-definition.const';
import { universeDefinition } from './store/universe/universe-definition.const';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
        accountsDefinition,
        universeDefinition,
        screenDefinition,
      ]),
    ],
    children: [
      {
        path: '',
        outlet: 'accounts',
        loadComponent: async () =>
          import('./accounts/account').then((m) => m.Account),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: async () =>
          import('./dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'profile',
        loadComponent: async () =>
          import('./auth/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'test-session-warning',
        loadComponent: async () =>
          import('./test-session-warning.component').then(
            (m) => m.TestSessionWarningComponent
          ),
      },
      {
        path: 'global/summary',
        loadComponent: async () =>
          import('./global/global-summary').then((m) => m.GlobalSummary),
      },
      {
        path: 'global/universe',
        loadComponent: async () =>
          import('./global/global-universe').then((m) => m.GlobalUniverse),
      },
      {
        path: 'global/screener',
        loadComponent: async () =>
          import('./global/global-screener').then((m) => m.GlobalScreener),
      },
      {
        path: 'global/error-logs',
        loadComponent: async () =>
          import('./global/global-error-logs/global-error-logs').then((m) => m.GlobalErrorLogs),
      },
      {
        path: 'demo/charts',
        loadComponent: async () =>
          import('./demo/chart-demo').then((m) => m.ChartDemo),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: async () =>
      import('./auth/auth.routes').then((m) => m.authRoutes),
  },
];
