import { Route } from '@angular/router';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

import { authGuard } from './auth/guards/auth.guard';
import { ShellComponent } from './shell/shell.component';
import { accountsDefinition } from './store/accounts/accounts-definition.const';
import { divDepositTypesDefinition } from './store/div-deposit-types/div-deposit-types-definition.const';
import { divDepositDefinition } from './store/div-deposits/div-deposit-definition.const';
import { riskGroupDefinition } from './store/risk-group/risk-group-definition.const';
import { screenDefinition } from './store/screen/screen-definition.const';
import { topDefinition } from './store/top/top-definition.const';
import { openTradesDefinition } from './store/trades/open-trades-definition.const';
import { soldTradesDefinition } from './store/trades/sold-trades-definition.const';
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
        riskGroupDefinition,
      ]),
    ],
    children: [
      {
        path: '',
        outlet: 'accounts',
        loadComponent: async () =>
          import('./accounts/account').then((m) => m.AccountComponent),
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
          import('./auth/profile/profile').then((m) => m.ProfileComponent),
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
          import('./shared/components/summary-view/summary-view').then(
            (m) => m.SummaryViewComponent
          ),
        data: { mode: 'global' },
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
        path: 'global/cusip-cache',
        loadComponent: async () =>
          import('./global/cusip-cache/cusip-cache.component').then(
            (m) => m.CusipCacheComponent
          ),
      },
      {
        path: 'global/error-logs',
        loadComponent: async () =>
          import('./global/global-error-logs/global-error-logs').then(
            (m) => m.GlobalErrorLogsComponent
          ),
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
              provideSmartFeatureSignalEntities('app', [
                openTradesDefinition,
                soldTradesDefinition,
                divDepositDefinition,
                divDepositTypesDefinition,
              ]),
            ],
            children: [
              {
                path: '',
                loadComponent: async () =>
                  import('./shared/components/summary-view/summary-view').then(
                    (m) => m.SummaryViewComponent
                  ),
                data: { mode: 'account' },
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
                    './account-panel/dividend-deposits/dividend-deposits.component'
                  ).then((m) => m.DividendDepositsComponent),
              },
            ],
          },
        ],
      },
      {
        path: 'demo/charts',
        loadComponent: async () =>
          import('./demo/chart-demo').then((m) => m.ChartDemoComponent),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: async () =>
      import('./auth/auth.routes').then((m) => m.authRoutes),
  },
];
