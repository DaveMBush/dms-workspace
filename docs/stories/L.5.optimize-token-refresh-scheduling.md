# Story L.5: Optimize Token Refresh Scheduling

## Status

Draft

## Story

**As a** single-user application owner,
**I want** token refresh operations to be less intrusive and more efficient,
**so that** token refreshes happen in the background without blocking user interactions.

## Acceptance Criteria

1. Move token refresh to background scheduling (Web Workers or service workers)
2. Implement predictive token refresh based on usage patterns
3. Add intelligent refresh scheduling to avoid peak usage times
4. Ensure refresh operations don't block user interactions
5. Add refresh queue management for multiple tokens
6. Create fallback mechanisms for failed background refreshes
7. Unit tests for optimized refresh scheduling

## Tasks / Subtasks

- [ ] Implement background refresh using Web Workers (AC: 1)
  - [ ] Create Web Worker for token refresh operations
  - [ ] Move fetchAuthSession calls to background thread
  - [ ] Implement message passing between main thread and worker
  - [ ] Add fallback for environments without Web Worker support
- [ ] Create refresh scheduling algorithms based on token expiry (AC: 2)
  - [ ] Implement predictive refresh timing
  - [ ] Calculate optimal refresh window (e.g., 15 minutes before expiry)
  - [ ] Add usage pattern analysis for refresh timing
  - [ ] Create adaptive refresh intervals
- [ ] Add refresh queue with priority management (AC: 5)
  - [ ] Implement token refresh queue
  - [ ] Add priority levels for urgent vs scheduled refreshes
  - [ ] Handle concurrent refresh requests
  - [ ] Implement retry logic for failed refreshes
- [ ] Implement non-blocking refresh operations (AC: 4)
  - [ ] Ensure UI thread is never blocked by refresh operations
  - [ ] Use background processing for all AWS API calls
  - [ ] Implement async patterns throughout refresh flow
  - [ ] Add progress indicators for long-running refreshes
- [ ] Add intelligent refresh scheduling (AC: 3)
  - [ ] Avoid refresh during peak usage patterns
  - [ ] Schedule refreshes during idle periods
  - [ ] Implement user activity detection
  - [ ] Add configurable refresh windows
- [ ] Create fallback mechanisms for failed background refreshes (AC: 6)
  - [ ] Implement fallback to main thread refresh
  - [ ] Add retry strategies for failed background operations
  - [ ] Create circuit breaker for repeated failures
  - [ ] Maintain session validity during fallback scenarios
- [ ] Create comprehensive unit tests (AC: 7)
  - [ ] Test Web Worker token refresh functionality
  - [ ] Test refresh scheduling algorithms
  - [ ] Test queue management under load
  - [ ] Test fallback mechanisms

## Dev Notes

### Dependencies

Depends on Stories L.1 (Token Caching) and L.2 (Interceptor Optimization) for efficient token management foundation.

### Current Token Refresh Performance Issues

Current `TokenRefreshService` implementation:

- Synchronous refresh operations block UI thread
- No intelligent scheduling - refreshes happen reactively
- No background processing - all AWS calls on main thread
- No queue management for concurrent refresh requests
- Refresh happens during user interactions causing delays

### Current Token Refresh Architecture

**TokenRefreshService** (`apps/rms/src/app/auth/services/token-refresh.service.ts`):

- Called synchronously from auth interceptor
- `fetchAuthSession()` blocks until AWS response
- No background processing capabilities
- Reactive refresh only (waits until near expiry)

**Current Flow**:

```
User Action → HTTP Request → Auth Interceptor → TokenRefresh → AWS API (BLOCKING)
```

### Target Background Refresh Architecture

```
Background Scheduler → Predictive Refresh → Web Worker → AWS API (NON-BLOCKING)
User Action → HTTP Request → Cached Token → Continue (FAST)
```

**Web Worker Implementation**:

```typescript
// token-refresh.worker.ts
addEventListener('message', async (event) => {
  const { type, tokenData } = event.data;
  if (type === 'REFRESH_TOKEN') {
    const result = await fetchAuthSession();
    postMessage({ type: 'REFRESH_COMPLETE', token: result });
  }
});
```

### Technical Implementation Details

**File Locations**:

- Create: `apps/rms/src/app/auth/workers/token-refresh.worker.ts`
- Modify: `apps/rms/src/app/auth/services/token-refresh.service.ts`
- Create: `apps/rms/src/app/auth/services/refresh-scheduler.service.ts`
- Create: `apps/rms/src/app/auth/services/refresh-queue.service.ts`

**Background Refresh Strategy**:

1. **Predictive Timing**: Refresh 15-20 minutes before expiry
2. **Activity Detection**: Monitor user activity for optimal timing
3. **Queue Management**: Handle multiple concurrent refresh needs
4. **Fallback Support**: Graceful degradation when Web Workers unavailable

**Refresh Scheduling Algorithm**:

- Monitor token expiry time
- Track user activity patterns
- Schedule refresh during low activity periods
- Avoid refresh during active user sessions
- Implement exponential backoff for failures

**Queue Management**:

- Priority queue: urgent refreshes vs scheduled refreshes
- Deduplication: avoid multiple refreshes for same token
- Retry logic: exponential backoff for failed attempts
- Circuit breaker: stop attempting after repeated failures

**Integration with Token Cache (L.1)**:

- Update cache immediately when background refresh completes
- Invalidate cache on refresh failures
- Use cache to serve requests during background refresh

### Testing

**Testing Standards from Architecture**:

- **Location**: Tests adjacent to source files with `.spec.ts` extension
- **Framework**: Jest with Web Worker testing utilities
- **Coverage**: Minimum 85% line coverage including worker code
- **Integration**: Test worker communication and fallback scenarios

**Specific Test Requirements**:

- Web Worker token refresh functionality
- Message passing between main thread and worker
- Refresh scheduling algorithm accuracy
- Queue management under concurrent load
- Fallback mechanisms when workers unavailable
- Integration with token cache service

**Web Worker Testing**:

- Mock Web Worker environment for testing
- Test token refresh in worker thread
- Test communication protocols
- Test error handling in worker context

**Performance Testing**:

- Background refresh should not impact UI responsiveness
- Queue processing should handle 100+ concurrent requests
- Fallback scenarios should maintain <100ms response time
- Refresh scheduling should optimize based on usage patterns

**Integration Testing**:

- End-to-end background refresh flow
- Integration with token cache updates
- Coordination with auth interceptor
- User experience during background refresh

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
