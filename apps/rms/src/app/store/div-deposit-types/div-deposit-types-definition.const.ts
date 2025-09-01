import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { DivDepositType } from './div-deposit-type.interface';
import { divDepositTypesEffectsServiceToken } from './div-deposit-types-effect-service-token';

export const divDepositTypesDefinition: SmartEntityDefinition<DivDepositType> =
  {
    entityName: 'divDepositTypes',
    effectServiceToken: divDepositTypesEffectsServiceToken,
    defaultRow: function standardLocationsDefaultRowFunction(id) {
      return {
        id,
        name: '',
      };
    },
  };
