import { InjectionToken } from '@angular/core';
import { DivDepositsEffectsService } from './div-deposits-effect.service';


export const divDepositsEffectsServiceToken = new InjectionToken<DivDepositsEffectsService>(
  'DivDepositsEffectsService'
);
