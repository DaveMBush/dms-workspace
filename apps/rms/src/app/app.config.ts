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
import { TopEffectsService } from './store/top/top-effect.service';
import { topEffectsServiceToken } from './store/top/top-effect-service-token';
import { accountEffectsServiceToken } from './store/accounts/account-effect-service-token';
import { AccountEffectsService } from './store/accounts/account-effect.service';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideSmartFeatureSignalEntities, provideSmartNgRX } from '@smarttools/smart-signals';
import { accountsDefinition } from './store/accounts/accounts-definition.const';
import { topDefinition } from './store/top/top-definition.const';

export const appConfig: ApplicationConfig = {
  providers: [{
    provide: topEffectsServiceToken,
    useClass: TopEffectsService,
  }, {
    provide: accountEffectsServiceToken,
    useClass: AccountEffectsService,
  },
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.p-dark',
        },
      },
    }),
    provideHttpClient(withInterceptorsFromDi(),withFetch()),
    provideRouter(appRoutes),
    provideClientHydration(withEventReplay()),
    provideSmartNgRX(),
      provideSmartFeatureSignalEntities('tree-standard', [
        topDefinition,
        accountsDefinition
      ])
  ],
};
