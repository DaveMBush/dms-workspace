import { Route } from '@angular/router';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

import { authGuard, guestGuard } from './auth/guards/auth.guard';
import { accountsDefinition } from './store/accounts/accounts-definition.const';
import { divDepositTypesDefinition } from './store/div-deposit-types/div-deposit-types-definition.const';
import { divDepositDefinition } from './store/div-deposits/div-deposit-definition.const';
import { riskGroupDefinition } from './store/risk-group/risk-group-definition.const';
import { screenDefinition } from './store/screen/screen-definition.const';
import { topDefinition } from './store/top/top-definition.const';
import { tradesDefinition } from './store/trades/trades-definition.const';
import { universeDefinition } from './store/universe/universe-definition.const';

export const appRoutes: Route[] = [
  // Authentication routes
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: async () =>
          import('./auth/login/login').then((m) => m.Login),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  // Protected application routes
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: async () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
        riskGroupDefinition,
        universeDefinition,
        divDepositTypesDefinition,
        divDepositDefinition,
      ]),
    ],
    children: [
      {
        path: '',
        outlet: 'accounts',
        loadComponent: async () =>
          import('./accounts/account').then((m) => m.Account),
        providers: [
          provideSmartFeatureSignalEntities('app', [accountsDefinition]),
        ],
      },
      {
        path: 'account/:accountId',
        loadComponent: async () =>
          import('./account-panel/account-panel.component').then(
            (m) => m.AccountPanelComponent
          ),
        children: [
          {
            path: '',
            loadComponent: async () =>
              import('./account-panel/account-detail.component').then(
                (m) => m.AccountDetailComponent
              ),
            providers: [
              provideSmartFeatureSignalEntities('app', [tradesDefinition]),
            ],
            children: [
              {
                path: '',
                loadComponent: async () =>
                  import('./account-panel/summary/summary.component').then(
                    (m) => m.SummaryComponent
                  ),
              },
              {
                path: 'open',
                loadComponent: async () =>
                  import(
                    './account-panel/open-positions/open-positions.component'
                  ).then((m) => m.OpenPositionsComponent),
              },
              {
                path: 'sold',
                loadComponent: async () =>
                  import(
                    './account-panel/sold-positions/sold-positions.component'
                  ).then((m) => m.SoldPositionsComponent),
              },
              {
                path: 'div-dep',
                loadComponent: async () =>
                  import(
                    './account-panel/dividend-deposits/dividend-deposits'
                  ).then((m) => m.DividendDeposits),
              },
            ],
          },
        ],
      },
      {
        path: 'global/universe',
        loadComponent: async () =>
          import('./global/global-universe/global-universe.component').then(
            (m) => m.GlobalUniverseComponent
          ),
      },
      {
        path: 'global/screener',
        loadComponent: async () =>
          import('./global/screener/screener').then((m) => m.Screener),
        providers: [
          provideSmartFeatureSignalEntities('app', [screenDefinition]),
        ],
      },
      {
        path: 'global/summary',
        loadComponent: async () =>
          import('./global/global-summary/global-summary.component').then(
            (m) => m.GlobalSummaryComponent
          ),
      },
      {
        path: 'global/error-logs',
        loadComponent: async () =>
          import('./global/global-error-logs/global-error-logs.component').then(
            (m) => m.GlobalErrorLogsComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: async () =>
          import('./auth/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  // Catch-all route - redirect to login for unauthenticated users
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
