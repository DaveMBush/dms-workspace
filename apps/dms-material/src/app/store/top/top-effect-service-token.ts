import { InjectionToken } from '@angular/core';

import { TopEffectsService } from './top-effect.service';

export const topEffectsServiceToken = new InjectionToken<TopEffectsService>(
  'TopEffectsService'
);
