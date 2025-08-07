import { InjectionToken } from '@angular/core';

import { UniverseEffectsService } from './universe-effect.service';

export const universeEffectsServiceToken = new InjectionToken<UniverseEffectsService>(
  'UniverseEffectsService'
);
