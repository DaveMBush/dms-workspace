# E2E Testing Guide

## Database Isolation Issue

The E2E tests share a single SQLite database (`test-database.db`). When multiple browser projects (Chromium and Firefox) run tests simultaneously, they interleave and cause database conflicts, leading to test failures.

### Problem

With default Playwright parallel execution:

- Tests **interleave between browsers**: Test 1 Chromium → Test 1 Firefox → Test 2 Chromium → Test 2 Firefox
- Both browsers hit the same database, causing SQLite locking and data pollution

### Solution

The default `e2e` target now runs browsers **sequentially** (complete one browser before starting the next) to ensure database isolation.

## Running Tests

### Default (Recommended - Sequential Execution)

Run all tests with both browsers, one browser at a time:

```bash
# Using pnpm script (runs Chromium, then Firefox)
pnpm e2e:dms-material

# Or using nx directly
nx e2e dms-material-e2e
```

### UI Mode (Interactive Debugging)

Run tests in Playwright's interactive UI mode (Chromium only):

```bash
# Launch Playwright UI
pnpm e2e:dms-material:ui

# Or: nx e2e-ui dms-material-e2e
```

### Single Browser

Run tests for only one browser:

```bash
# Chromium only
pnpm e2e:dms-material:chromium
# Or: nx e2e-chromium dms-material-e2e

# Firefox only
pnpm e2e:dms-material:firefox
# Or: nx e2e-firefox dms-material-e2e
```

## Running Specific Test Files

To test a specific file:

```bash
# Both browsers (sequential)
pnpm playwright test apps/dms-material-e2e/src/login.spec.ts

# Single browser
pnpm playwright test apps/dms-material-e2e/src/login.spec.ts --project=chromium
pnpm playwright test apps/dms-material-e2e/src/login.spec.ts --project=firefox

# UI mode for debugging
pnpm playwright test apps/dms-material-e2e/src/login.spec.ts --project=chromium --ui
```

## CI/CD Usage

The default command works correctly in CI:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: pnpm e2e:dms-material
```

## Future Improvements

To enable truly parallel browser execution, consider:

1. **Separate databases per browser**: Configure each browser project to use its own database file (e.g., `chromium-test.db`, `firefox-test.db`)
2. **Better test cleanup**: Implement robust `beforeEach`/`afterEach` hooks to reset database state
3. **Transaction rollback**: Wrap each test in a transaction that rolls back after completion
4. **Separate backend instances**: Run different backend servers on different ports for each browser

## Test Statistics

- Total tests: ~1,018 (509 per browser)
- Estimated time:
  - Default (sequential, both browsers): ~32 minutes
  - Single browser: ~16 minutes
