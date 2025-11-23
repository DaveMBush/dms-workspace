# Story AA.5: Set Up Application Configuration with Material Providers

## Story

**As a** developer building the rms-material application
**I want** the app.config.ts properly configured with all required providers
**So that** the application has all dependencies wired correctly for runtime

## Context

**Current System (RMS):**

- `app.config.ts` configures PrimeNG, SmartNgRX, HTTP client, routing
- Uses `providePrimeNG()` for PrimeNG configuration
- Conditional auth service based on environment

**New Configuration:**

- Remove PrimeNG provider
- Keep all other providers (SmartNgRX, HTTP, routing, auth)
- Add Material-specific configuration if needed

## Acceptance Criteria

### Functional Requirements

- [ ] All SmartNgRX entity effect services registered
- [ ] Auth services conditionally provided based on environment
- [ ] HTTP client configured with interceptors
- [ ] Router configured with app routes
- [ ] Animations enabled for Material components
- [ ] Error handler registered

### Technical Requirements

- [ ] `app.config.ts` mirrors RMS configuration minus PrimeNG
- [ ] All injection tokens properly configured
- [ ] Zoneless change detection enabled
- [ ] Browser global error listeners enabled

### Provider Configuration

- [ ] `provideZonelessChangeDetection()` - Zoneless Angular
- [ ] `provideBrowserGlobalErrorListeners()` - Global error handling
- [ ] `provideAnimationsAsync()` - Material animations
- [ ] `provideHttpClient()` - HTTP with interceptors
- [ ] `provideRouter()` - Application routing
- [ ] `provideSmartNgRX()` - SmartNgRX state management
- [ ] All effect service tokens - 8 entity stores
- [ ] Auth service tokens - Conditional mock/real services

### Validation Requirements

- [ ] Application bootstraps without errors
- [ ] All services injectable
- [ ] HTTP interceptor working
- [ ] Router navigating correctly

## Technical Approach

### Step 1: Create App Configuration

Create/update `apps/rms-material/src/app/app.config.ts`:

```typescript
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
    // SmartNgRX effect service providers
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
```

### Step 2: Create Initial Routes

Create `apps/rms-material/src/app/app.routes.ts`:

```typescript
import { Route } from '@angular/router';

// Initial minimal routes - will be expanded in later stories
export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: async () =>
      import('./app.component').then((m) => m.AppComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
```

### Step 3: Update Main Entry Point

Verify `apps/rms-material/src/main.ts`:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
```

### Step 4: Verify Bootstrap

```bash
pnpm nx run rms-material:serve
```

Check browser console for any bootstrap errors.

## Comparison: RMS vs RMS-Material Config

| Provider | RMS | RMS-Material |
|----------|-----|--------------|
| `provideZonelessChangeDetection()` | ✅ | ✅ |
| `provideBrowserGlobalErrorListeners()` | ✅ | ✅ |
| `provideAnimationsAsync()` | ✅ | ✅ |
| `providePrimeNG()` | ✅ | ❌ Removed |
| `provideHttpClient()` | ✅ | ✅ |
| `provideRouter()` | ✅ | ✅ |
| `provideSmartNgRX()` | ✅ | ✅ |
| Effect service tokens (8) | ✅ | ✅ |
| Auth service tokens | ✅ | ✅ |
| Error handler token | ✅ | ✅ |

## Files Modified

| File | Changes |
|------|---------|
| `apps/rms-material/src/app/app.config.ts` | Complete configuration with all providers |
| `apps/rms-material/src/app/app.routes.ts` | Initial routing configuration |
| `apps/rms-material/src/main.ts` | Verify bootstrap configuration |

## Definition of Done

- [ ] app.config.ts created with all providers
- [ ] All 8 effect service tokens registered
- [ ] Auth services conditionally provided
- [ ] HTTP client configured with interceptor
- [ ] Router configured
- [ ] SmartNgRX provider added
- [ ] Application bootstraps without errors
- [ ] No console errors on load
- [ ] Build succeeds
- [ ] Lint passes

## Notes

- The only difference from RMS config is removal of `providePrimeNG()`
- All SmartNgRX patterns remain identical
- Auth conditional logic preserved for mock development
- Routes will be fully implemented in later stories (AB.1+)
- This completes the infrastructure setup - ready for component migration
