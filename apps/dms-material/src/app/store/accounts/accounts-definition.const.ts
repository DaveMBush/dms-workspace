import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Account } from './account.interface';
import { accountEffectsServiceToken } from './account-effect-service-token';

export const accountsDefinition: SmartEntityDefinition<Account> = {
  entityName: 'accounts',
  effectServiceToken: accountEffectsServiceToken,
  defaultRow: function standardLocationsDefaultRowFunction(id) {
    return {
      id,
      name: '',
      openTrades: { startIndex: 0, indexes: [], length: 0 },
      soldTrades: { startIndex: 0, indexes: [], length: 0 },
      divDeposits: { startIndex: 0, indexes: [], length: 0 },
      months: [],
    };
  },
};
