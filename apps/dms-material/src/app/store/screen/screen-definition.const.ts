import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { Screen } from './screen.interface';
import { screenEffectsServiceToken } from './screen-effect-service-token';

export const screenDefinition: SmartEntityDefinition<Screen> = {
  entityName: 'screens',
  effectServiceToken: screenEffectsServiceToken,
  defaultRow: function standardLocationsDefaultRowFunction(id) {
    return {
      id,
      symbol: '',
      risk_group: '',
    };
  },
};
