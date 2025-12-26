import { InjectionToken } from '@angular/core';

import { ScreenEffectsService } from './screen-effect.service';

export const screenEffectsServiceToken =
  new InjectionToken<ScreenEffectsService>('ScreenEffectsService');
