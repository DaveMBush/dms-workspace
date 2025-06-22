import { Route } from '@angular/router';
import { topDefinition } from './store/top/top-definition.const';
import { accountsDefinition } from './accounts/store/accounts/accounts-definition.const';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
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
    ]
  },
];
