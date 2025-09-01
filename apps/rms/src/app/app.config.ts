import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import aura from '@primeng/themes/aura';
import {
  provideSmartNgRX,
  smartErrorHandlerToken,
} from '@smarttools/smart-signals';
import { providePrimeNG } from 'primeng/config';

import { appRoutes } from './app.routes';
import { ErrorHandlerService } from './error-handler/error-handler.service';
import { UniverseSyncService } from './shared/services/universe-sync.service';
import { AccountEffectsService } from './store/accounts/account-effect.service';
import { accountEffectsServiceToken } from './store/accounts/account-effect-service-token';
import { DivDepositTypesEffectsService } from './store/div-deposit-types/div-deposit-types-effect.service';
import { divDepositTypesEffectsServiceToken } from './store/div-deposit-types/div-deposit-types-effect-service-token';
import { DivDepositsEffectsService } from './store/div-deposits/div-deposits-effect.service';
import { divDepositsEffectsServiceToken } from './store/div-deposits/div-deposits-effect-service-token';
import { RiskGroupEffectsService } from './store/risk-group/risk-group-effect.service';
import { riskGroupEffectsServiceToken } from './store/risk-group/risk-group-effect-service-token';
import { ScreenEffectsService } from './store/screen/screen-effect.service';
import { screenEffectsServiceToken } from './store/screen/screen-effect-service-token';
import { TopEffectsService } from './store/top/top-effect.service';
import { topEffectsServiceToken } from './store/top/top-effect-service-token';
import { TradeEffectsService } from './store/trades/trade-effect.service';
import { tradeEffectsServiceToken } from './store/trades/trade-effect-service-token';
import { UniverseEffectsService } from './store/universe/universe-effect.service';
import { universeEffectsServiceToken } from './store/universe/universe-effect-service-token';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: topEffectsServiceToken,
      useClass: TopEffectsService,
    },
    {
      provide: accountEffectsServiceToken,
      useClass: AccountEffectsService,
    },
    {
      provide: riskGroupEffectsServiceToken,
      useClass: RiskGroupEffectsService,
    },
    {
      provide: universeEffectsServiceToken,
      useClass: UniverseEffectsService,
    },
    {
      provide: tradeEffectsServiceToken,
      useClass: TradeEffectsService,
    },
    {
      provide: divDepositsEffectsServiceToken,
      useClass: DivDepositsEffectsService,
    },
    {
      provide: divDepositTypesEffectsServiceToken,
      useClass: DivDepositTypesEffectsService,
    },
    {
      provide: smartErrorHandlerToken,
      useClass: ErrorHandlerService,
    },
    {
      provide: screenEffectsServiceToken,
      useClass: ScreenEffectsService,
    },
    {
      provide: UniverseSyncService,
      useClass: UniverseSyncService,
    },

    // provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
          darkModeSelector: '.p-dark',
        },
      },
    }),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideRouter(appRoutes),
    provideSmartNgRX(),
  ],
};
