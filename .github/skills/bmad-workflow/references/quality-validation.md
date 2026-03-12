# Quality Validation Loop

Run this loop in multiple phases across BMAD workflows. You MUST re-run ALL steps from the beginning until ALL checks pass in a single iteration.

**Preferred execution model**: Run this entire loop inside a dedicated subagent so test output, retries, code-review passes, and auto-fix reasoning do not consume the parent workflow's context window.

**Max Loop Iterations: 10**

**CRITICAL LOOP STRUCTURE**: After fixing any errors in steps below, you MUST re-run ALL steps from the beginning (step 1 → 2 → 3 → 4 → 5) until ALL five checks pass in a single iteration with no errors.

For each step, attempt up to 10 times with automatic fixes between attempts:

## Step 1: Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior
- **For ESLint failures**: Fix the lint error; do not use eslint-disable comments or otherwise circumvent the problem
- Retry up to 10 times with different fix strategies each time
- On 10th failure: Call `.github/prompts/prompt.sh "pnpm all failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

## Step 2: Run E2E Tests

```bash
pnpm e2e:dms-material:chromium
pnpm e2e:dms-material:firefox
```

**Note**: E2E tests take over 10 minutes to complete because tests run sequentially one at a time to avoid database collisions. This is expected behavior.

- Run tests, analyze failures (flaky tests, timing issues, etc.)
- **For UI interaction failures**: Use Playwright to manually validate the flow
- **For unclear API behavior**: Query Context7 for expected behavior
- Apply fixes and retry up to 10 times
- On 10th failure: Call `.github/prompts/prompt.sh "E2E tests failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

## Step 3: Check Duplicates

```bash
pnpm dupcheck
```

- Run check, identify duplicate code
- Refactor duplicates if straightforward
- Retry up to 10 times with different refactoring strategies
- On 10th failure: Call `.github/prompts/prompt.sh "Duplicate code detected after 10 refactoring attempts: <duplicate details>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

## Step 4: Format Code

```bash
pnpm format
```

- Should rarely fail
- If fails: Call `.github/prompts/prompt.sh "pnpm format failed: <error>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

## Step 5: Code Self-Review (Changed Files Only)

Identify all files changed on this branch relative to `main`:

```bash
git diff --name-only origin/main...HEAD
```

Then:

1. Read the project code review guidelines: `.github/instructions/code-review.md`
2. For each changed TypeScript (`.ts`), HTML (`.html`), and shell (`.sh`) file, apply the guidelines from that file
3. Auto-fix **all 🔴 CRITICAL and 🟡 IMPORTANT findings** (e.g. anonymous functions, raw SQL string interpolation, exposed secrets, missing typed error handling, N+1 queries, signal misuse). Do NOT skip findings just because they seem minor.
4. **Do not auto-fix 🟢 SUGGESTION items** — these are non-blocking and would risk over-engineering
5. **If any fixes were applied**: restart the validation loop from step 1 (the fixes may affect lint, tests, or formatting)
6. **If no changes were needed**: step 5 is complete, proceed to Validation Loop Completion

**Note on thoroughness**: Review every changed file, not just obviously problematic ones. Pay particular attention to:

- Anonymous/arrow functions (forbidden by `@smarttools/no-anonymous-functions`)
- RxJS usage outside EffectService implementations
- Prisma raw query string interpolation
- Missing `OnPush` on new Angular components
- `effect()` used for derived state instead of `computed()`

## Validation Loop Completion

- If ALL five checks (1, 2, 3, 4, 5) pass in the same iteration: Validation complete, proceed to next phase
- If any check fails and gets fixed: Return to step 1 and run all checks again
- If validation loop reaches 10 complete iterations: Call `.github/prompts/prompt.sh "Validation loop reached 10 iterations without all checks passing"`

**Critical**: All validation checks must pass in a single iteration before proceeding.
