import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  Provider,
  provideZoneChangeDetection,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TopEffectsService } from './store/top/top-effect.service';
import { topEffectsServiceToken } from './store/top/top-effect-service-token';
import { accountEffectsServiceToken } from './accounts/store/accounts/account-effect-service-token';
import { AccountEffectsService } from './accounts/store/accounts/account-effect.service';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideSmartNgRX, smartErrorHandlerToken } from '@smarttools/smart-signals';
import { ErrorHandlerService } from './error-handler/error-handler.service';
import { RiskGroupEffectsService } from './store/risk-group/risk-group-effect.service';
import { riskGroupEffectsServiceToken } from './store/risk-group/risk-group-effect-service-token';

export const appConfig: ApplicationConfig = {
  providers: [{
    provide: topEffectsServiceToken,
    useClass: TopEffectsService,
  }, {
    provide: accountEffectsServiceToken,
    useClass: AccountEffectsService,
  }, {
    provide: riskGroupEffectsServiceToken,
    useClass: RiskGroupEffectsService,
  }, {
      provide: smartErrorHandlerToken,
      useClass: ErrorHandlerService,
    },

    // provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
          darkModeSelector: '.p-dark'
        },
      },
    }),
    provideHttpClient(withInterceptorsFromDi(),withFetch()),
    provideRouter(appRoutes),
    provideSmartNgRX()
  ],
};
