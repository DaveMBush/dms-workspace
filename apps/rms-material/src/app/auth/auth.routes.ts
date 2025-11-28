import { Route } from '@angular/router';

export const authRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: async () => import('./login/login').then((m) => m.Login),
  },
];
