import { Route } from '@angular/router';

import { authGuard } from './auth/guards/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
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
