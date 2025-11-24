import { InjectionToken } from '@angular/core';

import { RiskGroupEffectsService } from './risk-group-effect.service';

export const riskGroupEffectsServiceToken =
  new InjectionToken<RiskGroupEffectsService>('RiskGroupEffectsService');
