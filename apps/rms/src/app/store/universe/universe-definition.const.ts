import { SmartEntityDefinition } from '@smarttools/smart-signals';
import { Universe } from './universe.interface';
import { universeEffectsServiceToken } from './universe-effect-service-token';

export const universeDefinition: SmartEntityDefinition<Universe> = {
  entityName: 'universe',
  effectServiceToken: universeEffectsServiceToken,
  defaultRow: function defaultRowFunction(id) {
    return {
      id,
      name: '',
      distribution: 0,
      distributions_per_year: 0,
      last_price: 0,
      most_recent_sell_date: '',
      symbol: '',
      ex_date: '',
      risk: 0,
      risk_group: 0,
      expired: false,
    };
  },
};
