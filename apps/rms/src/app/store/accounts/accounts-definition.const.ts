import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Account } from './account.interface';
import { accountEffectsServiceToken } from './account-effect-service-token';

export const accountsDefinition: SmartEntityDefinition<Account> =
{
    entityName: 'accounts',
    effectServiceToken: accountEffectsServiceToken,
    defaultRow: function standardLocationsDefaultRowFunction(id) {
      return {
        id,
        name: '',
        trades: [],
        divDeposits: []
      };
    },
  };
