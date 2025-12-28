import { InjectionToken } from '@angular/core';

import { TradeEffectsService } from './trade-effect.service';

export const tradeEffectsServiceToken = new InjectionToken<TradeEffectsService>(
  'TradeEffectsService'
);
