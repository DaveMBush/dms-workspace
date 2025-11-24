import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import {
  provideSmartNgRX,
  smartErrorHandlerToken,
} from '@smarttools/smart-signals';

import { environment } from '../environments/environment';
import { configureAmplify } from './amplify.config';
import { appRoutes } from './app.routes';
import { AuthService } from './auth/auth.service';
import { authInterceptor } from './auth/interceptors/auth.interceptor';
import { MockAuthService } from './auth/mock-auth.service';
import { MockProfileService } from './auth/services/mock-profile.service';
import { ProfileService } from './auth/services/profile.service';
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

// Configure Amplify before app initialization only if not using mock auth
const shouldUseMockAuth = environment.auth?.useMockAuth;
if (!shouldUseMockAuth) {
  configureAmplify();
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Conditional auth service provider
    {
      provide: AuthService,
      useClass: shouldUseMockAuth ? MockAuthService : AuthService,
    },
    // Conditional profile service provider
    {
      provide: ProfileService,
      useClass: shouldUseMockAuth ? MockProfileService : ProfileService,
    },
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

    // Angular core providers
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),

    // HTTP client with auth interceptor
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi(),
      withFetch()
    ),

    // Router
    provideRouter(appRoutes),

    // SmartNgRX
    provideSmartNgRX(),
  ],
};
