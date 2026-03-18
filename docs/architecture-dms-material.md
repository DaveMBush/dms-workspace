# Frontend Architecture — dms-material

## Application Bootstrap

**Entry point**: `src/main.ts`

```typescript
bootstrapApplication(App, appConfig);
```

**Root component**: `AppComponent` (`dms-root`)
**Config provider**: `apps/dms-material/src/app/app.config.ts`

### ApplicationConfig Providers (app.config.ts)

| Provider                                                                  | Purpose                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `provideZonelessChangeDetection()`                                        | Zoneless Angular — no Zone.js, signals drive all CD                |
| `provideRouter(appRoutes)`                                                | Router with `withComponentInputBinding()`, `withViewTransitions()` |
| `provideHttpClient(withInterceptors([authInterceptor, sortInterceptor]))` | HTTP with interceptors                                             |
| `provideAnimationsAsync()`                                                | Async Material animations                                          |
| `provideSmartNgRX()`                                                      | SmartNgRX entity store framework initialization                    |
| `{ provide: AuthService, useClass: AuthService                            | MockAuthService }`                                                 | Conditional auth (based on `environment.auth.useMockAuth`) |
| `{ provide: ProfileService, useClass: ProfileService                      | MockProfileService }`                                              | Conditional profile                                        |
| Eight `EffectServiceToken` providers                                      | One per SmartNgRX entity (injected by entity definitions)          |
| `provideAppInitializer(() => inject(ThemeService).init())`                | Theme service initializer                                          |

---

## Routing Architecture

**File**: `apps/dms-material/src/app/app.routes.ts`

### Route Tree

```
/auth/**           → AuthRoutes (login, unauthenticated, confirm, MFA)
/                  → ShellComponent (authGuard)
  ├── (named outlet: accounts) → AccountComponent
  ├── /dashboard   → DashboardComponent (lazy)
  ├── /profile     → ProfileComponent (lazy)
  ├── /global/summary    → GlobalSummaryComponent (lazy)
  ├── /global/universe   → GlobalUniverseComponent (lazy)
  ├── /global/screener   → GlobalScreenerComponent (lazy)
  ├── /global/error-logs → GlobalErrorLogsComponent (lazy)
  ├── /global/cusip-cache → CusipCacheComponent (lazy)
  └── /account/:accountId → AccountPanelComponent (lazy)
        ├── (default)    → AccountDetailComponent
        ├── /open        → OpenPositionsComponent
        ├── /sold        → SoldPositionsComponent
        └── /div-dep     → DividendDepositsComponent
```

### SmartNgRX Feature Entity Providers

Entities are scoped with `provideSmartFeatureSignalEntities()` at the route level:

**Root shell route** — entities available to all routes:

- `top` — bootstrap entity (IDs for all top-level collections)
- `accounts` — investment accounts list
- `universe` — CEF watchlist symbols
- `screen` — screener result rows
- `riskGroup` — equity/income/tax-free risk categories

**`/account/:accountId` route** — entities scoped to account panel:

- `openTrades` — open positions
- `soldTrades` — sold (closed) positions
- `divDeposits` — dividend deposits
- `divDepositTypes` — deposit type enumeration

---

## SmartNgRX Entity Store Pattern

SmartNgRX replaces NgRx with a signal-based entity store using a typed effect-service contract.

### Entity Definition Pattern

```typescript
// Example: universe-definition.const.ts
export const universe: SmartEntityDefinition<Universe> = {
  entityName: 'universe',
  effectServiceToken: universeEffectServiceToken,
  defaultRow: (id) => ({ id, symbol: '', distribution: 0 /* ... */ }),
};
```

### Effect Service Pattern

```typescript
// universe-effect.service.ts
@Injectable({ providedIn: 'root' })
export class UniverseEffectService extends EffectService<Universe> {
  constructor(private http: HttpClient) { super(); }

  override loadByIds(ids: string[]): Observable<Universe[]> {
    return this.http.post<Universe[]>('/api/universe', ids);
  }
  override update(entity: Universe): Observable<Universe> { ... }
  override add(entity: Universe): Observable<Universe> { ... }
  override delete(id: string): Observable<void> { ... }
  override loadByIndexes(parentId: string, field: string): Observable<Universe[]> { ... }
}
```

### Entity Hierarchy

```
Top (bootstrap)
├── accounts[]       → Account entities
│   ├── openTrades[] → Trade entities (loaded by account ID)
│   ├── soldTrades[] → Trade entities (loaded by account ID)
│   ├── divDeposits[] → DivDeposit entities
│   └── divDepositTypes[]
├── universes[]      → Universe entities
├── riskGroups[]     → RiskGroup entities
└── screens[]        → Screen (screener data) entities
```

### How `loadByIds` Works

1. SmartNgRX calls `effectService.loadByIds(ids)` when entity IDs are present but data not cached
2. Effect service sends `POST /api/<entity>` with `string[]` body
3. Server queries DB by those IDs and returns entity array
4. Entities are merged into the signal store

---

## Authentication Architecture

### Production (AWS Cognito via Amplify)

1. `AmplifyConfig` initialized at app start from `amplify.config.ts`
2. `AuthService` wraps `Amplify.Auth.*` methods
3. On login: JWT stored in HTTP-only cookie via `POST /api/auth/set-secure-cookie`
4. `authInterceptor` reads cookie and attaches `Authorization: Bearer <token>` header
5. On 401: `TokenRefreshService` calls `fetchAuthSession()` → retries request
6. Token validation: `TokenHandlerService` checks expiry before use
7. Profile: `ProfileService` loads from `Amplify.Auth.fetchUserAttributes()`

### Development (Mock Auth)

When `environment.auth.useMockAuth = true`:

- `MockAuthService` is injected instead of `AuthService`
- `MockProfileService` returns static user profile
- Auth guards pass immediately; JWT cookie skipped
- Enabled in `environments/environment.ts`

### Auth Guard

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/auth/login']);
};
```

### HTTP Interceptors

**`authInterceptor`** — runs on every outgoing HTTP request:

1. Gets token from `TokenCacheService` (memory cache)
2. Attaches `Authorization: Bearer <token>`
3. On 401 response, triggers `TokenRefreshService.refresh()`
4. Retries the original request once with new token

**`sortInterceptor`** — maps Angular field names to server field names:

- Reads the pending sort/filter state from `SortFilterStateService`
- Attaches the state as JSON in the `x-table-state` header
- Example mapping: `buyDate → openDate`, `risk_group → risk_group`

---

## Component Architecture

### Design Principles

- All components are **standalone** (`standalone: true`, implied Angular 21 default)
- All components use **`OnPush` change detection**
- All dependency injection uses `inject()` function (no constructor injection)
- All inputs use `input()` signal, outputs use `output()`, view queries use `viewChild()`
- No NgModules anywhere

### Key Reusable Components

#### `BaseTableComponent<T>`

**File**: `apps/dms-material/src/app/shared/components/base-table/`

The core reusable table used across all entity lists.

- CDK virtual scroll (`CdkVirtualForOf`) for large lists
- `MatSort` for client-side and server-side column sort
- `MatTable` with `VirtualTableDataSource<T>` (custom DataSource)
- Column definitions injected as typed `ColumnDef<T>[]`
- Inline editing via `editable-cell` / `editable-date-cell` projected cells
- Row selection and multi-select checkboxes via CDK Selection

#### `SummaryDisplayComponent`

Renders a financial summary card:

- Total investment ($), current value ($), dividends received ($)
- Distribution yield (%), realized gain/loss ($), unrealized gain/loss ($)

#### `SymbolAutocompleteComponent`

- Debounced `GET /api/symbol/search?q=<term>` queries
- Material autocomplete overlay
- Emits selected `UniverseSymbol`

#### `ConfirmDialogComponent`

- MatDialog-based confirmation prompt
- Accepts `title`, `message`, `confirmLabel`, `cancelLabel`
- Returns `boolean` via `MatDialogRef.afterClosed()`

---

## Theming System

**Technology**: Angular Material 3 SCSS API + Tailwind 3 + custom CSS variables

### CSS Layer Order (`styles.scss`)

```scss
@layer tailwind-base, material, tailwind-utilities;
@import 'tailwind/base'; // Layer: tailwind-base
@include mat.core(); // Angular Material core
@import './themes/light-theme'; // Layer: material (light)
@import './themes/dark-theme'; // Dark variant
@import 'tailwind/components';
@import 'tailwind/utilities'; // Layer: tailwind-utilities
```

### Theme Files

| File                    | Content                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `_light-theme.scss`     | `mat.define-theme()` blue/yellow light palette                                      |
| `_dark-theme.scss`      | `mat.define-theme()` blue/yellow dark palette, assigned to `.dark-theme` body class |
| `_theme-variables.scss` | `--dms-primary`, `--dms-secondary`, `--dms-surface`, `--dms-error`, etc.            |

### Dark Mode

- `ThemeService` manages theme state
- Reads/writes `localStorage.theme` (`'light'` or `'dark'`)
- Toggles `.dark-theme` class on `document.body`
- Shell component has toolbar dark-mode toggle button

### Tailwind Usage Rules

- **Only for layout**: padding, margin, flex/grid, gap, overflow
- **Never for**: colors, typography, borders, shadows — all via Material or `--dms-*` vars
- Dark mode in Tailwind: `darkMode: ['class', '.dark-theme']` in `tailwind.config.js`

---

## HTTP Client & State

### Environment Configuration

| File                    | Used For           | Auth         | API URL                    |
| ----------------------- | ------------------ | ------------ | -------------------------- |
| `environment.ts`        | `nx serve` dev     | Mock         | `http://localhost:3000`    |
| `environment.prod.ts`   | Production build   | Real Cognito | Relative `/` (same-origin) |
| `environment.docker.ts` | Local Docker stack | Mock         | `http://localhost:8000`    |

### Proxy Configuration (`proxy.conf.json`)

In dev, all `/api/*` and `/auth/*` requests are proxied from port 4201 → port 3000.
This avoids CORS issues and mirrors the production nginx routing.

### Sort/Filter State Protocol

State for each table is stored in `SortFilterStateService` (keyed by table name):

```typescript
interface TableState {
  sort?: { field: string; direction: 'asc' | 'desc' };
  filters?: Record<string, string>;
  page?: { index: number; size: number };
}
type AllTableState = Record<string, TableState>;
```

`sortInterceptor` serializes `AllTableState` as JSON → `x-table-state` header on each request.
Server-side `parseSortFilterHeader.function.ts` deserializes it.

---

## Testing Approach

**Framework**: Vitest 4.0.9 with `jsdom` environment

### Test Utilities (`src/test-utils/`)

| Helper                             | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `getHarnessLoader()`               | Get CDK `HarnessLoader` for Material harness queries |
| `clickButton()`                    | Click by aria-label or test-id                       |
| `typeInInput()`                    | Type into MatInput (triggers CDK harness)            |
| `selectOption()`                   | Select from MatSelect                                |
| `createMockNotificationService()`  | Spy notification service                             |
| `createMockConfirmDialogService()` | Auto-confirm dialog service                          |
| `createMockMatDialog()`            | Mock MatDialog                                       |
| `createMockMatSnackBar()`          | Mock MatSnackBar                                     |

### Testing Pattern

```typescript
describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        /* mocks */
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    loader = getHarnessLoader(fixture);
    fixture.detectChanges();
  });
});
```
