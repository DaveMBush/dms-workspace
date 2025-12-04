import { Route } from '@angular/router';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

import { authGuard } from './auth/guards/auth.guard';
import { ShellComponent } from './shell/shell.component';
import { accountsDefinition } from './store/accounts/accounts-definition.const';
import { topDefinition } from './store/top/top-definition.const';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
        accountsDefinition,
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
    ],
  },
  {
    path: 'auth',
    loadChildren: async () =>
      import('./auth/auth.routes').then((m) => m.authRoutes),
  },
];
