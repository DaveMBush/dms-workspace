import { Route } from '@angular/router';
import { topDefinition } from './store/top/top-definition.const';
import { accountsDefinition } from './accounts/store/accounts/accounts-definition.const';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';
import { riskGroupDefinition } from './store/risk-group/risk-group-definition.const';
import { universeDefinition } from './store/universe/universe-definition.const';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
        riskGroupDefinition,
        universeDefinition
      ])
    ],
    children: [
      {
        path: '',
        outlet: 'accounts',
        loadComponent: () => import('./accounts/account').then((m) => m.Account),
        providers: [
          provideSmartFeatureSignalEntities('app', [
            accountsDefinition
          ])
        ]
      },
      {
        path: 'accounts/:accountId',
        loadComponent: () => import('./account-panel/account-panel.component').then(m => m.AccountPanelComponent),
      },
      {
        path: 'global/universe',
        loadComponent: () => import('./global/global-universe/global-universe.component').then(m => m.GlobalUniverseComponent),
      },
    ]
  },
];
