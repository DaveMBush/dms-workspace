import {
  ApplicationConfig,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideBrowserGlobalErrorListeners,
  Provider,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TopEffectsService } from './accounts/store/top/top-effect.service';
import { topEffectsServiceToken } from './accounts/store/top/top-effect-service-token';
import { accountEffectsServiceToken } from './accounts/store/accounts/account-effect-service-token';
import { AccountEffectsService } from './accounts/store/accounts/account-effect.service';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideSmartFeatureSignalEntities, provideSmartNgRX, smartErrorHandlerToken } from '@smarttools/smart-signals';
import { accountsDefinition } from './accounts/store/accounts/accounts-definition.const';
import { topDefinition } from './accounts/store/top/top-definition.const';
import { ErrorHandlerService } from './error-handler/error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [{
    provide: topEffectsServiceToken,
    useClass: TopEffectsService,
  }, {
    provide: accountEffectsServiceToken,
    useClass: AccountEffectsService,
  },    {
      provide: smartErrorHandlerToken,
      useClass: ErrorHandlerService,
    },

    // provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng'
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
