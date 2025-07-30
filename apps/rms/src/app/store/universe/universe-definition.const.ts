import { SmartEntityDefinition } from '@smarttools/smart-signals';
import { Universe } from './universe.interface';
import { universeEffectsServiceToken } from './universe-effect-service-token';

export const universeDefinition: SmartEntityDefinition<Universe> = {
  entityName: 'universes',
  effectServiceToken: universeEffectsServiceToken,
  defaultRow: function defaultRowFunction(id) {
    return {
      id,
      name: '',
      distribution: 0,
      distributions_per_year: 0,
      last_price: 0,
      most_recent_sell_date: '',
      most_recent_sell_price: 0,
      symbol: '',
      ex_date: '',
      risk: 0,
      risk_group_id: '',
      expired: false,
      position: 0,
    };
  },
};
