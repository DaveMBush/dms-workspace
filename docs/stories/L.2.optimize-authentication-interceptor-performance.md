# Story L.2: Optimize Authentication Interceptor Performance

## Status

Draft

## Story

**As a** single-user application owner,
**I want** the authentication interceptor to have minimal performance impact on HTTP requests,
**so that** every API call executes with less than 10ms authentication overhead instead of current 6-second delays.

## Acceptance Criteria

1. Move expensive authentication checks off the critical path
2. Implement fast-path for recently validated requests
3. Add request debouncing for rapid successive requests
4. Create non-blocking token validation flow
5. Add performance monitoring and logging
6. Reduce interceptor execution time to under 10ms per request
7. Unit tests for optimized interceptor scenarios

## Tasks / Subtasks

- [ ] Implement token validation cache with short TTL (AC: 2)
  - [ ] Create validation cache with 30-second TTL
  - [ ] Cache successful token validations to avoid repeated checks
  - [ ] Implement cache key strategy based on token hash
- [ ] Add request ID-based deduplication for concurrent requests (AC: 3)
  - [ ] Implement request deduplication logic
  - [ ] Handle multiple simultaneous requests with same token
  - [ ] Add request batching for concurrent authentication checks
- [ ] Use asynchronous validation where possible (AC: 4)
  - [ ] Refactor synchronous `await fetchAuthSession()` calls
  - [ ] Implement non-blocking token validation
  - [ ] Add background token validation for near-expiry scenarios
- [ ] Create separate code paths for authenticated vs. unauthenticated requests (AC: 1, 4)
  - [ ] Fast-path for requests with valid cached tokens
  - [ ] Separate handling for public endpoints
  - [ ] Optimize auth endpoint handling
- [ ] Add performance monitoring and logging (AC: 5)
  - [ ] Implement execution time tracking
  - [ ] Add structured logging with performance metrics
  - [ ] Create performance degradation alerts
- [ ] Reduce interceptor execution time to under 10ms (AC: 6)
  - [ ] Profile current interceptor performance
  - [ ] Optimize token retrieval operations
  - [ ] Remove blocking operations from critical path
- [ ] Create comprehensive unit tests (AC: 7)
  - [ ] Test fast-path scenarios with cached tokens
  - [ ] Test request deduplication logic
  - [ ] Test performance under load
  - [ ] Test error handling paths

## Dev Notes

### Previous Story Context

Depends on Story L.1 (Token Caching System). The token cache provides the foundation for fast token retrieval, and this story optimizes the interceptor to leverage that cache effectively.

### Current Performance Problem

The `auth.interceptor.ts` currently calls `getTokenWithRefresh()` which leads to `fetchAuthSession()` for EVERY HTTP request. This creates:

- Synchronous AWS API calls blocking the UI thread
- 6-second delays for simple operations
- Redundant authentication validation for concurrent requests
- No fast-path for recently validated tokens

### Current Interceptor Architecture

**File**: `apps/rms/src/app/auth/interceptors/auth.interceptor.ts`

**Current Flow**:

```
processAuthenticatedRequest() → getTokenWithRefresh() → authService.getAccessToken() → fetchAuthSession() → AWS API (SLOW)
```

**Key Functions to Optimize**:

- `processAuthenticatedRequest()`: Add fast-path logic
- `getTokenWithRefresh()`: Leverage L.1 token cache
- `handleTokenRefresh()`: Make non-blocking
- `createAuthenticatedRequest()`: Add validation cache

### Target Optimized Flow

```
HTTP Request → Validation Cache Check → Fast Continue (if valid)
              ↓ (only if cache miss)
              Background Token Validation → Cache Update
```

### Technical Implementation Details

**File Locations**:

- Modify: `apps/rms/src/app/auth/interceptors/auth.interceptor.ts`
- Create: `apps/rms/src/app/auth/services/token-validation-cache.service.ts`
- Update: Import token cache service from L.1

**Validation Cache Design**:

```typescript
interface ValidationCacheEntry {
  tokenHash: string;
  validUntil: number;
  requestCount: number;
}
```

**Performance Optimizations**:

1. **Fast Path**: Check validation cache before any AWS calls
2. **Request Deduplication**: Group concurrent requests with same token
3. **Background Validation**: Validate tokens asynchronously when near expiry
4. **Separate Code Paths**: Different logic for public/auth/authenticated endpoints

**Performance Monitoring**:

- Track interceptor execution time per request
- Log slow authentication operations (>50ms)
- Monitor cache hit rates for validation cache
- Alert on performance degradation

**Integration with L.1**:

- Use TokenCacheService from L.1 for actual token storage
- Validation cache supplements token cache with validation state
- Coordinate cache invalidation between both services

### Testing

**Testing Standards from Architecture**:

- **Location**: `apps/rms/src/app/auth/interceptors/auth.interceptor.spec.ts`
- **Framework**: Jest with Angular HTTP testing utilities
- **Coverage**: Minimum 85% line coverage, 75% branch coverage
- **Performance**: Include timing assertions for <10ms execution

**Specific Test Requirements**:

- Fast-path scenarios with valid cached tokens
- Request deduplication with concurrent requests
- Performance benchmarks for interceptor execution time
- Error handling when validation cache fails
- Integration with TokenCacheService from L.1
- Public endpoint bypass logic
- Token refresh scenarios

**Performance Test Scenarios**:

- Single request with cached token: <5ms
- Concurrent requests with same token: <10ms total
- Cache miss scenario: <50ms (acceptable for cache population)
- Load testing with 100 concurrent requests

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
