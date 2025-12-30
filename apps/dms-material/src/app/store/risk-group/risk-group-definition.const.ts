import { SmartEntityDefinition } from '@smarttools/smart-signals';

import { RiskGroup } from './risk-group.interface';
import { riskGroupEffectsServiceToken } from './risk-group-effect-service-token';

export const riskGroupDefinition: SmartEntityDefinition<RiskGroup> = {
  entityName: 'riskGroups',
  effectServiceToken: riskGroupEffectsServiceToken,
  defaultRow: function standardLocationsDefaultRowFunction(id) {
    return {
      id,
      name: '',
    };
  },
};
