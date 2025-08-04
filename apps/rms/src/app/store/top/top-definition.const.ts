import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Top } from './top.interface';
import { topEffectsServiceToken } from './top-effect-service-token';

export const topDefinition: SmartEntityDefinition<Top> = {
  entityName: 'top',
  effectServiceToken: topEffectsServiceToken,
  isInitialRow: true,
  defaultRow: function defaultRowFunction(id) {
    return {
      id,
      accounts: [],
      riskGroups: [],
      universes: [],
      divDepositTypes: [],
      holidays: [],
      screens: []
    };
  },
};
