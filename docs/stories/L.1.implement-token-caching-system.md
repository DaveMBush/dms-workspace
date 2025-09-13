# Story L.1: Implement Token Caching System

## Status

Approved

## Story

**As a** single-user application owner,
**I want** an efficient token caching mechanism to eliminate redundant AWS authentication calls,
**so that** authentication performance improves from 6-second delays to under 500ms for account operations.

## Acceptance Criteria

1. Implement in-memory token cache with automatic invalidation
2. Cache access tokens with expiration-based refresh
3. Reduce AWS `fetchAuthSession()` calls to only when cache expires
4. Add cache hit/miss metrics for monitoring
5. Ensure thread-safe cache access for concurrent requests
6. Unit tests for cache behavior and expiration scenarios
7. Performance benchmarks showing improvement over current implementation
8. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] Create TokenCacheService with configurable TTL (AC: 1, 2)
  - [ ] Design cache interface with get, set, invalidate methods
  - [ ] Implement in-memory storage with expiration tracking
  - [ ] Add configurable TTL (default 30 minutes)
  - [ ] Implement automatic cache invalidation on expiry
- [ ] Modify AuthService.getAccessToken() to check cache first (AC: 2, 3)
  - [ ] Update getAccessToken method to check cache before AWS call
  - [ ] Implement fallback to fetchAuthSession only on cache miss/expiry
  - [ ] Add error handling for cache operations
- [ ] Implement cache invalidation on sign out and token refresh (AC: 1)
  - [ ] Clear cache on user sign out
  - [ ] Invalidate cache on explicit token refresh
  - [ ] Handle session expiry scenarios
- [ ] Add cache warming on successful authentication (AC: 1)
  - [ ] Populate cache immediately after successful login
  - [ ] Update cache after successful token refresh
- [ ] Add cache hit/miss metrics for monitoring (AC: 4)
  - [ ] Implement metrics collection interface
  - [ ] Track cache hit ratio
  - [ ] Add performance timing measurements
- [ ] Ensure thread-safe cache access for concurrent requests (AC: 5)
  - [ ] Implement proper locking mechanisms
  - [ ] Handle concurrent access scenarios
  - [ ] Test race condition scenarios
- [ ] Create comprehensive unit tests (AC: 6)
  - [ ] Test cache hit/miss scenarios
  - [ ] Test expiration behavior
  - [ ] Test invalidation operations
  - [ ] Test concurrent access safety
- [ ] Implement performance benchmarks (AC: 7)
  - [ ] Create before/after performance tests
  - [ ] Measure authentication operation timing
  - [ ] Document performance improvements

## Dev Notes

### Previous Story Insights

Epic L addresses critical performance regression from K.5 token refresh implementation causing 6-second delays for account operations. Root cause: `auth.interceptor.ts` calls `authService.getAccessToken()` → `fetchAuthSession()` for EVERY HTTP request, making expensive synchronous AWS API calls.

### Current Authentication Architecture

- **Auth Service**: `apps/rms/src/app/auth/auth.service.ts` - Main authentication service extending BaseAuthService
- **Auth Interceptor**: `apps/rms/src/app/auth/interceptors/auth.interceptor.ts` - HTTP interceptor calling getAccessToken() for every request
- **Token Refresh Service**: Session management with TokenRefreshService and SessionManagerService
- **Current Flow**: HTTP Request → Auth Interceptor → getAccessToken() → fetchAuthSession() → AWS API Call (SLOW)

### Target Performance Flow

HTTP Request → Auth Interceptor → Cached Token Check → Fast Response (with background AWS refresh only when needed)

### Technical Implementation Details

**File Locations** [Source: Project structure analysis]:

- Create `TokenCacheService`: `apps/rms/src/app/auth/services/token-cache.service.ts`
- Modify `AuthService`: `apps/rms/src/app/auth/auth.service.ts`
- Update imports in: `apps/rms/src/app/auth/interceptors/auth.interceptor.ts`

**Cache Interface Design**:

```typescript
interface TokenCache {
  get(key: string): string | null;
  set(key: string, value: string, ttl: number): void;
  invalidate(key: string): void;
  clear(): void;
  getStats(): CacheStats;
}
```

**Performance Targets**:

- Reduce account loading from 6 seconds to <500ms
- Achieve 90%+ cache hit rate for normal usage
- Reduce authentication interceptor overhead to <10ms per request

**Testing Requirements** [Source: architecture/ci-and-testing.md]:

- **Unit Tests**: Jest with TestBed for services, coverage thresholds: lines 85%, branches 75%, functions 85%
- **Test Location**: Place tests adjacent to source files with `.spec.ts` extension
- **Framework**: Angular testing utilities with Jest (Nx preset)
- **Performance Tests**: Benchmark authentication operations before/after implementation

**Security Considerations**:

- Maintain existing security guarantees
- Ensure token freshness and validity
- Preserve authentication error handling
- Clear cache on security-related operations

### Testing

**Testing Standards from Architecture**:

- **Location**: Tests in same directory as source files with `.spec.ts` extension
- **Framework**: Jest with Angular TestBed for service testing
- **Coverage**: Minimum 85% line coverage, 75% branch coverage, 85% function coverage
- **Integration**: Use supertest for any HTTP-related testing
- **Performance**: Include timing benchmarks to validate <500ms target performance improvement

**Specific Test Requirements**:

- Cache expiration scenarios with different TTL values
- Concurrent request handling and thread safety
- Cache invalidation on sign out and token refresh
- Performance benchmarks comparing cached vs uncached token retrieval
- Error handling when cache operations fail

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
