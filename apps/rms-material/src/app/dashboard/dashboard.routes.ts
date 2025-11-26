import { Route } from '@angular/router';

export const dashboardRoutes: Route[] = [
  {
    path: '',
    loadComponent: async () =>
      import('./dashboard.component').then((m) => m.DashboardComponent),
  },
];
