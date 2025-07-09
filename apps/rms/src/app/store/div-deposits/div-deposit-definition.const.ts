import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { DivDeposit } from './div-deposit.interface';
import { divDepositsEffectsServiceToken } from './div-deposits-effect-service-token';

export const divDepositDefinition: SmartEntityDefinition<DivDeposit> =
{
    entityName: 'divDeposits',
    effectServiceToken: divDepositsEffectsServiceToken,
    defaultRow: function standardLocationsDefaultRowFunction(id) {
      return {
        id,
        date: new Date(),
        amount: 0,
        accountId: '',
        divDepositTypeId: '',
        universeId: ''
      };
    },
  };
