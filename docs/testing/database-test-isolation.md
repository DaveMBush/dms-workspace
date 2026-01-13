# Database Test Isolation Pattern

## Overview

When writing tests that interact with databases (particularly in the server project), proper isolation is critical to ensure tests can run:

- In parallel locally
- Distributed across multiple CI agents
- Without interfering with each other

## Pattern: Per-Worker Database Files

### Configuration

In `vitest.config.ts`, use the `{workerId}` placeholder to create unique database files per test worker:

```typescript
test: {
  env: {
    DATABASE_PROVIDER: 'sqlite',
    DATABASE_URL: 'file:./test-database-{workerId}.db',
    NODE_ENV: 'test',
  },
  poolOptions: {
    threads: {
      singleThread: false,
      isolate: true,
    },
  },
  globalTeardown: './vitest.teardown.ts',
}
```

### Cleanup

Create a `vitest.teardown.ts` file to clean up test databases:

```typescript
import { unlinkSync } from 'fs';
import { globSync } from 'glob';

export default function teardown() {
  const dbFiles = globSync('test-database-*.db', { cwd: __dirname });
  dbFiles.forEach((file) => {
    try {
      unlinkSync(`${__dirname}/${file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to clean up ${file}:`, error);
      }
    }
  });
}
```

### Gitignore

Add to `.gitignore`:

```text
test-database-*.db
```

## Why This Pattern?

### ✅ Advantages

- **Parallel Execution**: Multiple test files can run simultaneously without conflicts
- **CI Sharding**: Works with Nx Cloud distributed execution (each agent gets isolated databases)
- **Consistent Behavior**: Same isolation locally and in CI
- **Simple**: Standard SQLite file-based approach, no special URI handling

### ❌ Anti-Patterns to Avoid

**Don't use shared database files:**

```typescript
// ❌ BAD - All tests share the same database
DATABASE_URL: 'file:./test-database.db';
```

**Don't use in-memory without proper syntax:**

```typescript
// ❌ BAD - Can create literal filenames like ":memory:?cache=shared"
DATABASE_URL: 'file::memory:?cache=shared';
```

## Implementation Checklist

When creating new test suites that need database access:

- [ ] Configure `DATABASE_URL` with `{workerId}` placeholder
- [ ] Add `poolOptions.threads.isolate: true`
- [ ] Create `vitest.teardown.ts` for cleanup
- [ ] Add test database pattern to `.gitignore`
- [ ] Verify tests pass locally with `pnpm nx test <project>`
- [ ] Verify tests pass in CI with distributed execution

## Related Documentation

- [Nx Cloud Distributed Execution](https://nx.dev/ci/features/distribute-task-execution)
- [Vitest Configuration](https://vitest.dev/config/)
- [SQLite URI Filenames](https://www.sqlite.org/uri.html)

## History

This pattern was established when enabling Nx Cloud test sharding. Previous approaches using shared database files caused conflicts when tests ran in parallel across distributed agents.

See: [CI Workflow Configuration](../../.github/workflows/ci.yml)
