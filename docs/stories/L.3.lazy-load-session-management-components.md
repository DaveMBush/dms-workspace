# Story L.3: Lazy Load Session Management Components

## Status

Draft

## Story

**As a** single-user application owner,
**I want** session management components to initialize only when actually needed,
**so that** application startup time reduces by at least 50% by deferring expensive session initialization.

## Acceptance Criteria

1. Remove session management initialization from app startup
2. Initialize session components only on first authenticated request
3. Implement lazy service injection patterns
4. Add startup time measurements and monitoring
5. Reduce application bootstrap time by at least 50%
6. Ensure session management still works correctly when lazily loaded
7. Integration tests for lazy loading scenarios

## Tasks / Subtasks

- [ ] Modify service injection to use lazy providers (AC: 3)
  - [ ] Convert SessionManagerService to lazy loading pattern
  - [ ] Convert TokenRefreshService to lazy loading pattern
  - [ ] Update service dependencies for lazy initialization
  - [ ] Implement lazy injection decorators/patterns
- [ ] Remove session management from app startup (AC: 1)
  - [ ] Remove session initialization from AuthService constructor
  - [ ] Remove session setup from app bootstrap
  - [ ] Move initialization to on-demand trigger points
- [ ] Initialize session components on first authenticated request (AC: 2)
  - [ ] Add initialization trigger in auth interceptor
  - [ ] Implement session readiness check before first use
  - [ ] Handle race conditions for concurrent first requests
- [ ] Add service readiness checks before usage (AC: 6)
  - [ ] Implement service ready state management
  - [ ] Add initialization status tracking
  - [ ] Create fallback behavior for uninitialized services
- [ ] Create startup performance benchmarks (AC: 4, 5)
  - [ ] Implement startup timing measurement
  - [ ] Add performance monitoring for bootstrap process
  - [ ] Create before/after comparison metrics
- [ ] Ensure session management works correctly when lazy loaded (AC: 6)
  - [ ] Test session functionality after lazy initialization
  - [ ] Verify token refresh works with delayed startup
  - [ ] Test sign-out cleanup with lazy services
- [ ] Create integration tests for lazy loading scenarios (AC: 7)
  - [ ] Test app startup without session initialization
  - [ ] Test first authenticated request initialization
  - [ ] Test concurrent initialization scenarios
  - [ ] Test service readiness checks

## Dev Notes

### Current Session Initialization Problem

Current implementation initializes session management services during app startup in `AuthService` constructor:

- `SessionManagerService` starts immediately
- `TokenRefreshService` begins background processing
- Session event listeners are set up before needed
- This adds significant overhead to application bootstrap

### Current Architecture Analysis

**AuthService** (`apps/rms/src/app/auth/auth.service.ts`):

- Constructor calls `setupSessionEventListeners()`
- Immediately initializes session management
- Uses `setTimeout(() => { this.initializeAuth() })` for async init

**Session Services**:

- `SessionManagerService`: Manages session state and events
- `TokenRefreshService`: Handles background token refresh
- Both are injected and initialized immediately in AuthService

### Target Lazy Loading Architecture

```
App Startup → Minimal Auth Setup (no session services)
↓ (user makes first authenticated request)
First Auth Request → Initialize Session Services → Continue Request
```

**Lazy Service Pattern**:

```typescript
private sessionManager?: SessionManagerService;
private tokenRefresh?: TokenRefreshService;

private getSessionManager(): SessionManagerService {
  if (!this.sessionManager) {
    this.sessionManager = inject(SessionManagerService);
    this.initializeSessionManager();
  }
  return this.sessionManager;
}
```

### Technical Implementation Details

**File Locations**:

- Modify: `apps/rms/src/app/auth/auth.service.ts`
- Modify: `apps/rms/src/app/auth/services/session-manager.service.ts`
- Modify: `apps/rms/src/app/auth/services/token-refresh.service.ts`
- Update: `apps/rms/src/app/auth/interceptors/auth.interceptor.ts`

**Lazy Injection Strategy**:

1. **Deferred Service Creation**: Services created only when first accessed
2. **Initialization Triggers**: First authenticated request triggers initialization
3. **Readiness Checks**: Services check initialization status before operations
4. **Race Condition Handling**: Prevent multiple concurrent initializations

**Performance Targets**:

- Reduce startup time by 50% (if currently 2s, target <1s)
- Session initialization should complete in <100ms when triggered
- No functional degradation in session management

**Integration Points**:

- Auth Interceptor: Trigger session initialization on first auth request
- Auth Service: Lazy getter methods for session services
- App Bootstrap: Remove session initialization from startup

**Startup Performance Monitoring**:

- Measure time from app start to first render
- Track session initialization timing
- Monitor memory usage during startup
- Compare before/after metrics

### Testing

**Testing Standards from Architecture**:

- **Location**: Tests adjacent to source files with `.spec.ts` extension
- **Framework**: Jest with Angular TestBed for service testing
- **Coverage**: Minimum 85% line coverage, 75% branch coverage
- **Integration**: Test full lazy loading workflow

**Specific Test Requirements**:

- App startup without session service initialization
- First authenticated request triggers proper initialization
- Concurrent request handling during initialization
- Service readiness checks prevent usage before initialization
- Session functionality identical after lazy loading
- Performance benchmarks showing 50% startup improvement

**Integration Test Scenarios**:

- Cold start → first auth request → session initialization
- Multiple concurrent first requests → single initialization
- Session management functions (login, refresh, logout) work post-lazy-load
- Error handling during lazy initialization

**Performance Benchmarks**:

- Startup time measurement before/after implementation
- Memory usage profiling during startup
- Time-to-interactive measurements
- Session initialization timing once triggered

## Change Log

| Date       | Version | Description                        | Author       |
| ---------- | ------- | ---------------------------------- | ------------ |
| 2025-09-12 | 1.0     | Initial story creation from Epic L | Scrum Master |

## Dev Agent Record

### Agent Model Used

_To be populated by development agent_

### Debug Log References

_To be populated by development agent_

### Completion Notes List

_To be populated by development agent_

### File List

_To be populated by development agent_

## QA Results

_To be populated by QA agent_
