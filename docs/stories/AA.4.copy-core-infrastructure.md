# Story AA.4: Copy and Configure Core Infrastructure

## Story

**As a** developer building the rms-material application
**I want** all core infrastructure copied from the existing RMS application
**So that** the new application has identical business logic and state management

## Context

**Current System:**

- RMS application has established infrastructure:
  - Environment configurations (dev, prod)
  - AWS Amplify configuration for authentication
  - SmartNgRX state management (8 entity stores)
  - Error handling service
  - Shared services
  - Auth services

**Migration Approach:**

- Duplicate all infrastructure code into rms-material
- Update imports to reflect new file locations
- Preserve all business logic unchanged

## Acceptance Criteria

### Functional Requirements

- [ ] Environment files copied and configured
- [ ] Amplify configuration copied
- [ ] All store definitions and effects services copied
- [ ] Error handler service copied
- [ ] Auth services copied (AuthService, MockAuthService, ProfileService)
- [ ] All shared services copied

### Technical Requirements

- [ ] Directory structure mirrors existing RMS application
- [ ] All TypeScript imports updated for new paths
- [ ] No circular dependency issues
- [ ] All files pass lint checks

### Store Infrastructure (8 entities)

- [ ] `store/accounts/` - Account entity store
- [ ] `store/div-deposits/` - Dividend deposits entity store
- [ ] `store/div-deposit-types/` - Dividend deposit types entity store
- [ ] `store/risk-group/` - Risk group entity store
- [ ] `store/screen/` - Screen entity store
- [ ] `store/top/` - Top-level entity store
- [ ] `store/trades/` - Trades entity store
- [ ] `store/universe/` - Universe entity store

### Auth Infrastructure

- [ ] `auth/auth.service.ts` - Main auth service
- [ ] `auth/mock-auth.service.ts` - Mock auth for development
- [ ] `auth/services/profile.service.ts` - Profile service
- [ ] `auth/services/mock-profile.service.ts` - Mock profile service
- [ ] `auth/guards/auth.guard.ts` - Route guards
- [ ] `auth/interceptors/auth.interceptor.ts` - HTTP interceptor

### Validation Requirements

- [ ] All copied files compile without errors
- [ ] No missing imports
- [ ] Lint passes on all new files

## Technical Approach

### Step 1: Create Directory Structure

```bash
mkdir -p apps/rms-material/src/app/store/accounts
mkdir -p apps/rms-material/src/app/store/div-deposits
mkdir -p apps/rms-material/src/app/store/div-deposit-types
mkdir -p apps/rms-material/src/app/store/risk-group
mkdir -p apps/rms-material/src/app/store/screen
mkdir -p apps/rms-material/src/app/store/top
mkdir -p apps/rms-material/src/app/store/trades
mkdir -p apps/rms-material/src/app/store/universe
mkdir -p apps/rms-material/src/app/auth/guards
mkdir -p apps/rms-material/src/app/auth/interceptors
mkdir -p apps/rms-material/src/app/auth/services
mkdir -p apps/rms-material/src/app/error-handler
mkdir -p apps/rms-material/src/app/shared/services
mkdir -p apps/rms-material/src/environments
```

### Step 2: Copy Environment Files

Copy from `apps/rms/src/environments/`:

- `environment.ts`
- `environment.prod.ts`

No changes needed - these are configuration only.

### Step 3: Copy Amplify Configuration

Copy `apps/rms/src/app/amplify.config.ts` to `apps/rms-material/src/app/amplify.config.ts`.

No changes needed.

### Step 4: Copy Store Infrastructure

For each entity store directory, copy all files:

**accounts/**
- `account-effect.service.ts`
- `account-effect-service-token.ts`
- `accounts-definition.const.ts`
- `account.interface.ts`
- `select-accounts.function.ts`
- Any additional files

**Pattern for each store:**
```
{entity}-effect.service.ts      # Effects service extending EffectService<T>
{entity}-effect-service-token.ts # InjectionToken for effects service
{entity}-definition.const.ts     # SmartEntityDefinition
{entity}.interface.ts            # Entity interface
select-{entities}.function.ts    # createSmartSignal selector
```

### Step 5: Copy Auth Infrastructure

**auth/auth.service.ts** - Main authentication service
**auth/mock-auth.service.ts** - Mock for local development
**auth/guards/auth.guard.ts** - Contains authGuard and guestGuard
**auth/interceptors/auth.interceptor.ts** - JWT token interceptor
**auth/services/profile.service.ts** - User profile management
**auth/services/mock-profile.service.ts** - Mock profile for development

### Step 6: Copy Error Handler

Copy `apps/rms/src/app/error-handler/error-handler.service.ts`.

### Step 7: Copy Shared Services

Copy all services from `apps/rms/src/app/shared/services/`:

- `universe-sync.service.ts`
- Any other shared services

### Step 8: Update Imports

After copying, verify all import paths are correct. The relative paths should remain the same since directory structure is mirrored.

### Step 9: Verify Compilation

```bash
pnpm nx run rms-material:build
pnpm nx run rms-material:lint
```

## Files to Copy

### Environment Files
| Source | Destination |
|--------|-------------|
| `apps/rms/src/environments/environment.ts` | `apps/rms-material/src/environments/environment.ts` |
| `apps/rms/src/environments/environment.prod.ts` | `apps/rms-material/src/environments/environment.prod.ts` |

### Configuration Files
| Source | Destination |
|--------|-------------|
| `apps/rms/src/app/amplify.config.ts` | `apps/rms-material/src/app/amplify.config.ts` |

### Store Files (per entity)
| Source | Destination |
|--------|-------------|
| `apps/rms/src/app/store/{entity}/*` | `apps/rms-material/src/app/store/{entity}/*` |

### Auth Files
| Source | Destination |
|--------|-------------|
| `apps/rms/src/app/auth/auth.service.ts` | `apps/rms-material/src/app/auth/auth.service.ts` |
| `apps/rms/src/app/auth/mock-auth.service.ts` | `apps/rms-material/src/app/auth/mock-auth.service.ts` |
| `apps/rms/src/app/auth/guards/auth.guard.ts` | `apps/rms-material/src/app/auth/guards/auth.guard.ts` |
| `apps/rms/src/app/auth/interceptors/auth.interceptor.ts` | `apps/rms-material/src/app/auth/interceptors/auth.interceptor.ts` |
| `apps/rms/src/app/auth/services/profile.service.ts` | `apps/rms-material/src/app/auth/services/profile.service.ts` |
| `apps/rms/src/app/auth/services/mock-profile.service.ts` | `apps/rms-material/src/app/auth/services/mock-profile.service.ts` |

### Error Handler
| Source | Destination |
|--------|-------------|
| `apps/rms/src/app/error-handler/error-handler.service.ts` | `apps/rms-material/src/app/error-handler/error-handler.service.ts` |

### Shared Services
| Source | Destination |
|--------|-------------|
| `apps/rms/src/app/shared/services/*` | `apps/rms-material/src/app/shared/services/*` |

## Directory Structure After Copy

```
apps/rms-material/src/
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── app/
│   ├── amplify.config.ts
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── mock-auth.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   └── services/
│   │       ├── profile.service.ts
│   │       └── mock-profile.service.ts
│   ├── error-handler/
│   │   └── error-handler.service.ts
│   ├── shared/
│   │   └── services/
│   │       ├── theme.service.ts (from AA.3)
│   │       └── universe-sync.service.ts
│   └── store/
│       ├── accounts/
│       ├── div-deposits/
│       ├── div-deposit-types/
│       ├── risk-group/
│       ├── screen/
│       ├── top/
│       ├── trades/
│       └── universe/
```

## Definition of Done

- [ ] All environment files copied
- [ ] Amplify configuration copied
- [ ] All 8 store entity directories copied with all files
- [ ] All auth files copied (services, guards, interceptors)
- [ ] Error handler service copied
- [ ] All shared services copied
- [ ] All imports verified and working
- [ ] No TypeScript compilation errors
- [ ] Lint passes on all new files
- [ ] Build succeeds

## Notes

- This is a direct copy operation - no business logic changes
- File paths within the application remain the same
- SmartNgRX patterns are preserved exactly
- Auth flow is identical to existing application
- Mock services enable local development without AWS
