---
project_name: 'dms-workspace'
user_name: 'Dave'
date: '2026-03-16'
sections_completed:
  - technology_stack
  - angular_rules
  - state_management
  - styling_theming
  - server_backend
  - testing_rules
  - testing_convention
  - code_style
  - anti_patterns
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project. Focuses on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Stack

| Layer                 | Technology                                        | Version        |
| --------------------- | ------------------------------------------------- | -------------- |
| Frontend framework    | Angular (standalone, zoneless)                    | 21.2.x         |
| UI component library  | Angular Material + Angular CDK                    | 21.2.x         |
| CSS utility framework | Tailwind CSS                                      | 3.4.1          |
| Component styles      | SCSS                                              | —              |
| State management      | @smarttools/smart-signals + smart-core            | 3.0.0          |
| Auth                  | AWS Amplify (@aws-amplify/auth)                   | 6.x            |
| Charts                | chart.js + ng2-charts                             | 4.x / 10.x     |
| Backend framework     | Fastify                                           | 5.8.x          |
| ORM                   | Prisma                                            | 7.2.x          |
| Database driver       | better-sqlite3 via @prisma/adapter-better-sqlite3 | 12.6.x / 7.2.x |
| Monorepo tooling      | Nx                                                | 22.5.4         |
| Build (Angular)       | Vite + @analogjs/vite-plugin-angular              | 7.x / 2.1.x    |
| Build (Node)          | esbuild                                           | 0.25.x         |
| Unit testing          | Vitest + @analogjs/vitest-angular                 | 4.0.x          |
| E2E testing           | Playwright                                        | 1.55.1         |
| Language              | TypeScript                                        | 5.9.3          |
| Package manager       | pnpm                                              | 10.x           |
| Runtime               | Node.js                                           | 22+            |

> **PrimeNG is NOT used.** Any existing PrimeNG references in legacy files should be ignored and not replicated.

---

## Angular — Critical Rules

### Zoneless Change Detection

- The app uses `provideZonelessChangeDetection()` — **Zone.js is not loaded**.
- **NEVER** use `async` pipe on Observables to trigger change detection — it will not work.
- All reactive state must be signals or explicitly trigger CD via `ChangeDetectorRef.markForCheck()` when needed.
- Prefer converting Observables → signals via `toSignal()` from `@angular/core/rxjs-interop`.

### OnPush Required Everywhere

- Every component **must** declare `changeDetection: ChangeDetectionStrategy.OnPush`.
- No component may omit this — it is an ESLint error.

### Standalone Components Only — No NgModule

- All components, pipes, and directives are standalone (`standalone: true` is the Angular 21 default — no `standalone` declaration needed).
- **Never** create NgModules. Import what you need directly in each component's `imports` array.

### Dependency Injection — inject() Pattern

- **Always** use `inject()` for dependency injection — never use constructor parameters.

  ```ts
  // CORRECT
  private readonly service = inject(MyService);

  // WRONG
  constructor(private service: MyService) {}
  ```

- Field injection with `inject()` is done at class field initialization level, not inside methods.

### Signal-First State

- All component state must be signals (`signal()`, `computed()`, `effect()`).
- Services expose state as signals, not BehaviorSubjects.
- Use `input()` and `output()` for component I/O (signal-based, not `@Input`/`@Output`).
- Use `viewChild()` for template references, not `@ViewChild`.
- `input.required<T>()` for required inputs.

### Named Functions for Callbacks — No Anonymous Functions in Subscriptions

- ESLint (`@smarttools/no-anonymous-functions`) bans anonymous arrow functions in subscriptions and effect callbacks.
- Use named function declarations or the `const context = this` pattern:

  ```ts
  // CORRECT — named function
  .subscribe(function handleResult(value) { ... });

  // CORRECT — context pattern
  const context = this;
  .subscribe(function handleResult(value) { context.doSomething(value); });

  // WRONG — arrow in subscribe
  .subscribe((value) => { ... });
  ```

- Exception: `computed()` and `effect()` body arrows are allowed but need `// eslint-disable-next-line @smarttools/no-anonymous-functions -- <reason>`.

### Lazy-Loaded Routes

- Features are loaded via `loadComponent` or `loadChildren` — always keep routes lazy:
  ```ts
  loadComponent: async () => import('./my-feature/my-feature').then((m) => m.MyFeature);
  ```

### takeUntilDestroyed Pattern

- Use `takeUntilDestroyed(this.destroyRef)` (inject `DestroyRef`) instead of `takeUntil(destroy$)` + `ngOnDestroy`.

---

## State Management — SmartNgRX / Smart Signals

SmartNgRX (`@smarttools/smart-signals`) is the entity store layer. It manages server-synchronized paginated/virtual entities.

### Entity Definition Pattern

Every entity needs:

1. An interface (e.g., `Account`) with an `id: string` field
2. An `InjectionToken` for the effects service (e.g., `accountEffectsServiceToken`)
3. An `EffectService` class extending `EffectService<T>` with `loadByIds`, `update`, `add`, `delete`, `loadByIndexes`
4. A `SmartEntityDefinition<T>` const with `entityName`, `effectServiceToken`, `defaultRow`
5. Registration via `provideSmartFeatureSignalEntities(featureName, [definitions])` in route providers

### EffectService HTTP Convention

Effect services talk to the server via Angular `HttpClient`. The URL pattern is `./api/<entity-plural>`.

```ts
@Injectable()
export class AccountEffectsService extends EffectService<Account> {
  private http = inject(HttpClient);
  override loadByIds(ids: string[]): Observable<Account[]> {
    return this.http.post<Account[]>('./api/accounts', ids);
  }
}
```

### Child Array Fields

Parent entities reference children as `{ startIndex: number; indexes: string[]; length: number }` — these are virtual arrays managed by SmartNgRX, backed by the `/indexes` endpoint.

---

## Styling & Theming — Critical Rules

### CSS Layer Order

The `styles.scss` establishes strict CSS layer ordering to prevent Angular Material / Tailwind specificity conflicts:

```scss
@layer tailwind-base, material, tailwind-utilities;

@layer tailwind-base {
  @tailwind base;
}
@layer tailwind-utilities {
  @tailwind components;
  @tailwind utilities;
}
```

**Never** change this layer order. Material styles go in `@layer material` when overriding.

### Angular Material Theming

- Uses Material 3 (`mat.define-theme`) with blue primary palette, yellow tertiary.
- Light and dark themes defined in `src/themes/_light-theme.scss` and `_dark-theme.scss`.
- Apply theme overrides via `@include mat.all-component-themes(...)` or per-component mixins.
- **Never** use `::ng-deep` — use Material mixin overrides in the global theme.

### Dark Mode

- Dark mode toggled by adding `.dark-theme` class to `document.body`.
- Tailwind dark mode: `darkMode: ['class', '.dark-theme']`.
- Use `class:dark-theme` or Angular `ThemeService` — **never** use `prefers-color-scheme` media query directly in components.

### CSS Custom Properties

Use `--dms-*` custom properties for semantic colors (defined in `_theme-variables.scss`):

- `--dms-background`, `--dms-surface`, `--dms-text-primary`, `--dms-text-secondary`, `--dms-border`
- `--dms-primary-{50-900}`, `--dms-success`, `--dms-warning`, `--dms-error`, `--dms-info`

### Tailwind + Material Coexistence

- Use Tailwind utility classes for layout and spacing.
- Use Angular Material components for interactive UI (buttons, forms, dialogs, tables).
- **Do not** use Tailwind `bg-*`, `text-*`, `border-*` for colors on Material components — use theme variables instead.

### SCSS for Component Styles

- `inlineStyleLanguage: "scss"` — component styles use SCSS.
- Import `@use '@angular/material' as mat;` for Material mixins inside component SCSS.

### CSS Policy

**Prefer Tailwind utility classes for layout, spacing, and color. Use `--dms-*` / Angular Material theme tokens for brand colors. Component-level CSS is a last resort for truly component-specific styles that cannot be expressed otherwise.**

#### When to Use Each Approach

| Approach                 | Use When                                                                       | Examples                                                    |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Tailwind utility classes | Layout, spacing, display, overflow, flex/grid                                  | `class="flex flex-col h-full p-4 gap-2"`                    |
| `--dms-*` CSS variables  | Semantic colors that adapt to light/dark mode                                  | `color: var(--dms-error)`, `background: var(--dms-surface)` |
| Angular Material tokens  | Colors on Material components                                                  | `var(--mat-sys-primary)`, theme mixins                      |
| `host: { class: '...' }` | `:host` element layout on Angular components                                   | `host: { class: 'flex flex-col h-full' }`                   |
| Component SCSS           | Material component internal overrides, complex animations, truly unique styles | `mat-card { flex: 1; min-height: 0; }`                      |

#### Color-Mix for Derived Colors

Use `color-mix()` with theme variables instead of hardcoded rgba/hex for derived colors:

```scss
// ✅ Correct — adapts to theme
background-color: color-mix(in srgb, var(--dms-error) 15%, var(--dms-surface));
border-color: color-mix(in srgb, var(--dms-text-primary) 12%, transparent);

// ❌ Wrong — breaks in dark mode
background-color: rgba(239, 68, 68, 0.1);
border-color: rgba(0, 0, 0, 0.12);
```

---

## Backend — Fastify + Prisma

### Route Registration

- All API routes auto-loaded from `apps/server/src/app/routes/` with `/api` prefix (via `@fastify/autoload`).
- Each route folder has an `index.ts` that registers routes on the `FastifyInstance`.
- Exception: `feature-flags` is registered manually before autoload.

### Route Naming Pattern

Routes are registered as Fastify plugins. Functions are named `handleXxxRoute()` and called within a registration function.

### Prisma Client — Singleton

- The Prisma client is a singleton exported from `apps/server/src/app/prisma/prisma-client.ts`.
- Uses `PrismaBetterSqlite3` adapter (not the default Prisma client engine).
- Import as: `import { prisma } from '../../prisma/prisma-client';`
- **Never** instantiate `PrismaClient` directly in route handlers.

### Database Schema Conventions

- All models have: `id String @id @default(uuid())`, `createdAt`, `updatedAt`, `deletedAt DateTime?`, `version Int @default(1)`
- Soft-delete pattern: filter `deletedAt: null` in queries, never hard-delete.
- Table names are lowercase plural (e.g., `accounts`, `trades`, `universe`).
- `snake_case` for database column names (Prisma maps to camelCase in TS via `@@map`/`@map` if needed).

### Security Plugins

The server registers security hooks via plugins in `apps/server/src/app/plugins/`. Do not bypass these. Authentication uses JWT via `@fastify/cookie` + custom `auth.ts` plugin.

### Server Named Functions

Same as frontend — all callbacks and handlers must be named functions:

```ts
function handleGetAccountsRoute(fastify: FastifyInstance): void { ... }
```

---

## Testing — Critical Rules

### Unit Tests (Vitest + Angular)

- Test files: `*.spec.ts` co-located with source.
- Test environment: `jsdom` (Angular components), `node` (pure TS/server).
- Use `TestBed.inject()` (not constructor injection) in tests.
- **Always use test utilities** from `apps/dms-material/src/test-utils/`:
  - `clickButton(loader, text)` — `MatButtonHarness`
  - `getHarnessLoader(fixture)` — CDK HarnessLoader
  - `typeInInput(loader, label, value)` — `MatInputHarness`
  - `selectOption(loader, label, option)` — `MatSelectHarness`
  - `createMockConfirmDialogService()`, `createMockMatDialog()`, etc.
- Use Angular CDK Testing Harnesses (`MatXxxHarness`) for interacting with Material components — never query DOM directly for Material component interaction.
- `globals: true` is set — no `import { describe, it, expect }` needed.

### E2E Tests (Playwright)

- E2E tests in `apps/dms-material-e2e/src/`.
- Run against dms-material on port 4301 (not 4200).
- Use `test.describe.skip()` or `test.skip()` to disable tests in TDD RED phase.
- For error simulation: use `route.fulfill({ status: 500 })` — **not** `route.abort('failed')`.
- Do not use `waitForLoadState('networkidle')` — unreliable; use `expect.poll()` or explicit waits.
- Accessibility tests use `@axe-core/playwright` (`checkA11y`).

### Mock Services in Tests

Use factory functions from `test-utils/` to create consistent mocks. Do not inline mock objects.

---

## Testing Convention — TDD Story Ordering

All epics follow this mandatory TDD-first story ordering:

1. **ATDD story** — write failing tests using `bmad-testarch-atdd`
   - At the end of the ATDD story, all new tests **must be set to skip** (`test.describe.skip()` / `test.skip()` for Playwright; `describe.skip()` / `it.skip()` for Vitest) so the CI pipeline stays green.
2. **Implementation story** — implement the feature using `bmad-dev-story`
   - **Before writing any implementation code**, un-skip the tests added in the preceding ATDD story so they drive the implementation (TDD red → green cycle).
3. Repeat steps 1 and 2 for each feature within the epic.
4. **E2E story** at epic completion — generate automated E2E tests using `bmad-qa-generate-e2e-tests`
   - Review **every feature implemented in the epic** to ensure full E2E coverage; do not rely on unit tests alone.

---

## Code Quality & Style

### ESLint Rules (Flat Config)

Key enforced rules:

- `@smarttools/no-anonymous-functions` — no anonymous arrow functions in subscriptions/callbacks
- `unicorn/*` — many unicorn rules active (prefer modern JS)
- `sonarjs/*` — code smell detection
- `import/order` + `simple-import-sort` — strict import ordering
- `unused-imports/no-unused-imports` — no unused imports
- `max-params-no-constructor` — max 4 params (not in constructors)
- `@ngrx/*` — NgRx/SmartNgRX signal store rules

### File Naming

- Angular components: `kebab-case.ts` (no `.component.` suffix for newer files, e.g., `global-summary.ts`). Legacy files may have `.component.ts`.
- Services: `kebab-case.service.ts`
- Functions: `kebab-case.function.ts`
- Interfaces: `kebab-case.interface.ts`
- Constants: `kebab-case.const.ts`
- Types: `kebab-case.types.ts`
- Guards: `kebab-case.guard.ts`

### Component Selector Prefix

All selectors must be prefixed `dms-` (e.g., `selector: 'dms-my-component'`).

### Prettier Formatting

- Run `pnpm format` (`nx format:write`) before committing.
- Single quotes, no semi-colons (check `.prettierrc` if present, otherwise defer to nx format defaults).

### Import Order

Imports must be sorted: external → @angular → @smarttools/@ngrx → internal project paths.

---

## Anti-Patterns — Never Do These

| Anti-Pattern                                | Why                                              | Correct Alternative                                |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `new PrismaClient()` in routes              | Breaks singleton/connection pooling              | Use `import { prisma }` from prisma-client         |
| Constructor parameter injection             | ESLint error, pattern violation                  | Use `inject()` at field level                      |
| `async` pipe on Observable for CD           | Zoneless — won't trigger CD                      | Use `toSignal()` or signal-based state             |
| Anonymous arrow functions in `.subscribe()` | `@smarttools/no-anonymous-functions` ESLint rule | Named function expressions                         |
| `route.abort('failed')` in e2e mocks        | Flaky error simulation                           | `route.fulfill({ status: 500 })`                   |
| `waitForLoadState('networkidle')` in e2e    | Unreliable, causes flaky tests                   | `expect.poll()` or explicit await                  |
| `::ng-deep` in SCSS                         | Breaks encapsulation, deprecated                 | Material theme mixins                              |
| Importing from PrimeNG                      | PrimeNG is not used in this project              | Angular Material equivalents                       |
| `NgModule`                                  | Project is fully standalone                      | Standalone components only                         |
| Hard-deleting records                       | Breaks audit trail                               | Soft-delete via `deletedAt`                        |
| Querying without `deletedAt: null` filter   | Returns deleted records                          | Always filter `where: { deletedAt: null }`         |
| Using `@Input()` / `@Output()` decorators   | Legacy pattern                                   | `input()` / `output()` signal functions            |
| `@ViewChild()` decorator                    | Legacy pattern                                   | `viewChild()` signal function                      |
| Changing the CSS layer order                | Breaks Material/Tailwind coexistence             | Keep `tailwind-base, material, tailwind-utilities` |
| Writing component CSS for layout/spacing    | Tailwind utilities handle this                   | Use Tailwind utility classes in template           |
| Hardcoding hex/RGB color values in SCSS     | Breaks dark mode theming                         | Use `--dms-*` variables or Material tokens         |
| Using `:host {}` for layout in SCSS         | Tailwind host classes are preferred              | Use `host: { class: '...' }` in @Component         |

---

## Commands Quick Reference

```bash
pnpm all                          # lint + build + test (affected)
pnpm e2e:dms-material:chromium    # E2E tests on Chromium
pnpm e2e:dms-material:firefox     # E2E tests on Firefox
pnpm dupcheck                     # Duplicate code check (jscpd)
pnpm format                       # Format all code (nx format:write)
pnpm start:dms-material           # Dev server (port 4301)
pnpm start:server                 # API server
```

---

## Project Structure

```
apps/
  dms-material/       # Angular 21 frontend (Angular Material)
    src/
      app/
        auth/         # AWS Amplify auth + guards
        dashboard/    # Dashboard feature
        global/       # Global views (screener, summary, universe, logs)
        accounts/     # Accounts + trades feature
        shared/       # Shared components + services
        store/        # SmartNgRX entity definitions + effect services
        shell/        # App shell/layout component
      test-utils/     # Shared test helper utilities
      themes/         # SCSS theme files
  dms-material-e2e/   # Playwright E2E tests for dms-material
  server/             # Fastify API server
    src/app/
      plugins/        # Fastify plugins (auth, cors, security, cookies)
      routes/         # API route handlers (auto-loaded at /api)
      prisma/         # Prisma client singleton + schema helpers
      services/       # Business logic services
prisma/
  schema.prisma       # SQLite schema (better-sqlite3 adapter)
  migrations/         # Prisma migration history
```
