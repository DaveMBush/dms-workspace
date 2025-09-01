import { InjectionToken } from '@angular/core';

import { AccountEffectsService } from './account-effect.service';

export const accountEffectsServiceToken =
  new InjectionToken<AccountEffectsService>('AccountEffectsService');
