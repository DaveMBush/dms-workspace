import { Route } from '@angular/router';
import { topDefinition } from './accounts/store/top/top-definition.const';
import { accountsDefinition } from './accounts/store/accounts/accounts-definition.const';
import { provideSmartFeatureSignalEntities } from '@smarttools/smart-signals';

export const appRoutes: Route[] = [
  {
    path: '',
    outlet: 'accounts',
    loadComponent: () => import('./accounts/account').then((m) => m.Account),
    providers: [
      provideSmartFeatureSignalEntities('app', [
        topDefinition,
        accountsDefinition
      ])
    ]
  },
];
