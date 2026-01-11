# Server Testing Best Practices

## Database Test Isolation

⚠️ **Critical**: When writing tests that use databases, follow the [Database Test Isolation Pattern](./database-test-isolation.md).

### Quick Reference

For any test file that needs database access:

```typescript
// vitest.config.ts
test: {
  env: {
    DATABASE_URL: 'file:./test-database-{workerId}.db', // Unique per worker
  },
  poolOptions: {
    threads: { isolate: true }
  },
  globalTeardown: './vitest.teardown.ts',
}
```

**Why?** This ensures tests can run in parallel both locally and in distributed CI without conflicts.

See: [Full Database Test Isolation Documentation](./database-test-isolation.md)

## Test Organization

### File Naming

- Unit tests: `*.spec.ts`
- Integration tests: `*.integration.spec.ts`

### Test Structure

```typescript
describe('ComponentName or FunctionName', () => {
  // Setup
  beforeEach(() => {
    // Per-test setup
  });

  afterEach(() => {
    // Per-test cleanup
  });

  describe('methodName', () => {
    it('should handle expected behavior', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test implementation
    });
  });
});
```

## Coverage Requirements

- Aim for >80% code coverage
- 100% coverage for critical business logic
- All public methods should have tests
- Edge cases and error scenarios must be tested

## CI/CD Integration

Tests run as part of:

- `pnpm nx affected -t test` (local)
- Distributed across Nx Cloud agents in CI
- Each agent runs tests in parallel with isolated databases

## Story/Epic Checklist

When creating new stories that involve server-side code:

- [ ] Database tests follow isolation pattern (if applicable)
- [ ] Unit tests written for all new functions/methods
- [ ] Integration tests for API endpoints
- [ ] Error scenarios are tested
- [ ] Tests pass locally: `pnpm nx test server`
- [ ] Tests pass in CI with distribution enabled

## Related Documentation

- [Database Test Isolation Pattern](./database-test-isolation.md)
- [Unit Test Coverage](./unit-test-coverage.md)
