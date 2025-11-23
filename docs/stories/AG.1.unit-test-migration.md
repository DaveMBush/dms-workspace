# Story AG.1: Unit Test Migration

## Story

**As a** developer maintaining the rms-material application
**I want** comprehensive unit test coverage
**So that** I can confidently make changes without breaking functionality

## Context

**Current System:**

- RMS has 625+ unit tests (based on recent test run)
- Tests use Vitest
- Tests mock PrimeNG components

**Migration Target:**

- Duplicate tests for rms-material
- Update mocks for Material components
- Maintain or improve coverage

## Acceptance Criteria

### Functional Requirements

- [ ] All component tests migrated
- [ ] All service tests copied (unchanged)
- [ ] All utility function tests copied (unchanged)
- [ ] Material component mocks created
- [ ] All tests pass

### Technical Requirements

- [ ] Vitest configuration for rms-material
- [ ] Material testing utilities imported
- [ ] Mock dialogs and snackbars properly
- [ ] Test coverage maintained

### Coverage Requirements

- [ ] Component coverage >= 80%
- [ ] Service coverage >= 90%
- [ ] Overall coverage >= 85%

## Technical Approach

### Step 1: Copy Test Infrastructure

Copy test configuration files:

- `apps/rms-material/tsconfig.spec.json`
- `apps/rms-material/vitest.config.ts` (if separate)

### Step 2: Create Material Testing Utilities

Create `apps/rms-material/src/test-utils/material-test-utils.ts`:

```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatInputHarness } from '@angular/material/input/testing';

export function getHarnessLoader<T>(fixture: ComponentFixture<T>): HarnessLoader {
  return TestbedHarnessEnvironment.loader(fixture);
}

export async function clickButton(loader: HarnessLoader, text: string): Promise<void> {
  const button = await loader.getHarness(MatButtonHarness.with({ text }));
  await button.click();
}

export async function selectOption(loader: HarnessLoader, label: string, value: string): Promise<void> {
  const select = await loader.getHarness(MatSelectHarness.with({ selector: `[aria-label="${label}"]` }));
  await select.open();
  await select.clickOptions({ text: value });
}

export async function typeInInput(loader: HarnessLoader, placeholder: string, value: string): Promise<void> {
  const input = await loader.getHarness(MatInputHarness.with({ placeholder }));
  await input.setValue(value);
}
```

### Step 3: Create Mock Services

Create `apps/rms-material/src/test-utils/mock-services.ts`:

```typescript
import { of } from 'rxjs';

export const mockNotificationService = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  show: vi.fn(),
};

export const mockConfirmDialogService = {
  confirm: vi.fn().mockReturnValue(of(true)),
};

export const mockMatDialog = {
  open: vi.fn().mockReturnValue({
    afterClosed: () => of(null),
  }),
};

export const mockMatSnackBar = {
  open: vi.fn(),
};
```

### Step 4: Migrate Component Tests

For each component, update tests:

1. Replace PrimeNG imports with Material imports
2. Update template selectors
3. Use Material harnesses for interactions
4. Update assertions for Material behavior

**Example migration:**

```typescript
// Before (PrimeNG)
const button = fixture.debugElement.query(By.css('p-button'));
button.triggerEventHandler('onClick', null);

// After (Material)
const loader = getHarnessLoader(fixture);
await clickButton(loader, 'Submit');
```

### Step 5: Run Tests

```bash
pnpm nx run rms-material:test --code-coverage
```

## Test Categories

### Component Tests (migrate)

- Shell component
- Login component
- Profile components
- Account list
- Global Universe
- Screener
- Positions tables
- Dividend deposits
- Dialogs

### Service Tests (copy unchanged)

- Auth service
- Profile service
- Effect services
- Notification service
- Theme service

### Utility Tests (copy unchanged)

- Function utilities
- Validators
- Formatters

## Definition of Done

- [ ] All tests copied to rms-material
- [ ] Material mocks created
- [ ] Test harness utilities created
- [ ] All tests pass
- [ ] Coverage >= 85%
- [ ] `pnpm nx run rms-material:test --code-coverage` succeeds

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Unit tests can be run from command line
- [ ] Coverage report generates correctly
- [ ] No flaky tests (run 3x to verify)

### Edge Cases

- [ ] Tests pass in CI environment (headless)
- [ ] Tests pass with different timezones configured
- [ ] Tests handle async operations correctly (no race conditions)
- [ ] Mock services reset between tests (no state leakage)
- [ ] Large test suites complete within timeout (< 5 minutes)
- [ ] Parallel test execution works correctly
- [ ] Coverage thresholds enforced on PR
- [ ] Failed tests provide clear error messages
- [ ] Snapshot tests updated correctly on component changes
- [ ] Tests work with Angular Material test harnesses
- [ ] Dialog mock properly isolates tests
- [ ] Zone.js async operations properly awaited
- [ ] Tests pass after dependency updates
- [ ] Test isolation (each test can run independently)
- [ ] Random test order execution passes

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.

**Note:** This story primarily focuses on unit tests, but e2e tests should verify the CI/CD pipeline runs unit tests correctly.
