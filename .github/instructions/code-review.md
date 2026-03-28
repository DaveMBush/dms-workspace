---
description: 'Generic code review instructions that can be customized for any project using GitHub Copilot'
applyTo: '**'
excludeAgent: ['coding-agent']
---

# Generic Code Review Instructions

Comprehensive code review guidelines for GitHub Copilot that can be adapted to any project. These instructions follow best practices from prompt engineering and provide a structured approach to code quality, security, testing, and architecture review.

## Review Language

When performing a code review, respond in **English**.

## Review Priorities

When performing a code review, prioritize issues in the following order:

### 🔴 CRITICAL (Block merge)

- **Security**: Vulnerabilities, exposed secrets, authentication/authorization issues
- **Correctness**: Logic errors, data corruption risks, race conditions
- **Breaking Changes**: API contract changes without versioning
- **Data Loss**: Risk of data loss or corruption

### 🟡 IMPORTANT (Requires discussion)

- **Code Quality**: Severe violations of SOLID principles, excessive duplication
- **Test Coverage**: Missing tests for critical paths or new functionality
- **Performance**: Obvious performance bottlenecks (N+1 queries, memory leaks)
- **Architecture**: Significant deviations from established patterns

### 🟢 SUGGESTION (Non-blocking improvements)

- **Readability**: Poor naming, complex logic that could be simplified
- **Optimization**: Performance improvements without functional impact
- **Best Practices**: Minor deviations from conventions
- **Documentation**: Missing or incomplete comments/documentation

## General Review Principles

When performing a code review, follow these principles:

1. **Be specific**: Reference exact lines, files, and provide concrete examples
2. **Provide context**: Explain WHY something is an issue and the potential impact
3. **Suggest solutions**: Show corrected code when applicable, not just what's wrong
4. **Be constructive**: Focus on improving the code, not criticizing the author
5. **Recognize good practices**: Acknowledge well-written code and smart solutions
6. **Be pragmatic**: Not every suggestion needs immediate implementation
7. **Group related comments**: Avoid multiple comments about the same topic

## Code Quality Standards

When performing a code review, check for:

### Clean Code

- Descriptive and meaningful names for variables, functions, and classes
- Single Responsibility Principle: each function/class does one thing well
- DRY (Don't Repeat Yourself): no code duplication
- Functions should be small and focused (ideally < 50 lines)
- Avoid deeply nested code (max 2 levels)
- Avoid magic numbers and strings (use constants)
- Code should be self-documenting; comments only when necessary
- **Use named functions** — anonymous functions are forbidden by the `@smarttools/no-anonymous-functions` ESLint rule

### Examples

```typescript
// ❌ BAD: Poor naming, magic numbers, and anonymous function
const calc = (x: number, y: number) => (x > 100 ? y * 0.15 : y * 0.1);

// ✅ GOOD: Clear naming, constants, and named function
const PREMIUM_THRESHOLD = 100;
const PREMIUM_DISCOUNT_RATE = 0.15;
const STANDARD_DISCOUNT_RATE = 0.1;

function calculateDiscount(orderTotal: number, itemPrice: number): number {
  const isPremiumOrder = orderTotal > PREMIUM_THRESHOLD;
  const discountRate = isPremiumOrder ? PREMIUM_DISCOUNT_RATE : STANDARD_DISCOUNT_RATE;
  return itemPrice * discountRate;
}
```

### Error Handling

- Proper error handling at appropriate levels
- Meaningful error messages
- No silent failures or ignored exceptions
- Fail fast: validate inputs early
- Use appropriate error types/exceptions

### Examples

```typescript
// ❌ BAD: Silent failure and generic error
function processSymbol(symbolId: string): void {
  try {
    const symbol = db.get(symbolId);
    symbol.process();
  } catch (_e) {
    // swallowed
  }
}

// ✅ GOOD: Explicit error handling with typed errors
function processSymbol(symbolId: string): ProcessedSymbol {
  if (!symbolId || symbolId.trim().length === 0) {
    throw new Error(`Invalid symbolId: "${symbolId}"`);
  }

  const symbol = db.get(symbolId);
  if (!symbol) {
    throw new Error(`Symbol "${symbolId}" not found in database`);
  }

  return symbol.process();
}
```

## Security Review

When performing a code review, check for security issues:

- **Sensitive Data**: No passwords, API keys, tokens, or PII in code or logs
- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection**: Use parameterized queries, never string concatenation
- **Authentication**: Proper authentication checks before accessing resources
- **Authorization**: Verify user has permission to perform action
- **Cryptography**: Use established libraries, never roll your own crypto
- **Dependency Security**: Check for known vulnerabilities in dependencies

### Examples

```typescript
// ❌ BAD: Raw query with string interpolation — injection risk
const result = await prisma.$queryRaw(`SELECT * FROM universe WHERE symbol = '${symbol}'`);

// ✅ GOOD: Prisma parameterized query
const result = await prisma.universe.findFirst({
  where: { symbol },
});
```

```typescript
// ❌ BAD: Exposed secret in code
const API_KEY = 'sk_live_abc123xyz789';

// ✅ GOOD: Use environment variables (loaded via dotenv / NX env files)
const API_KEY = process.env['API_KEY'];
```

## Testing Standards

When performing a code review, verify test quality:

- **Coverage**: Critical paths and new functionality must have tests
- **Test Names**: Descriptive names that explain what is being tested
- **Test Structure**: Clear Arrange-Act-Assert or Given-When-Then pattern
- **Independence**: Tests should not depend on each other or external state
- **Assertions**: Use specific assertions, avoid generic assertTrue/assertFalse
- **Edge Cases**: Test boundary conditions, null values, empty collections
- **Mock Appropriately**: Mock external dependencies, not domain logic

### Examples

```typescript
// ❌ BAD: Vague name, no structure, generic assertion
test('test1', () => {
  const result = calculateDiscount(50, 20);
  expect(result).toBeTruthy();
});

// ✅ GOOD: Descriptive name, Arrange-Act-Assert, specific assertion (vitest)
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders under $100', () => {
    // Arrange
    const orderTotal = 50;
    const itemPrice = 20;

    // Act
    const discount = calculateDiscount(orderTotal, itemPrice);

    // Assert
    expect(discount).toBe(2.0);
  });
});
```

For Angular components, use `TestBed` with signal mocking:

```typescript
// ❌ BAD: Testing implementation details, no signal isolation
it('renders universe rows', () => {
  // fixture not configured, signals not mocked
  expect(component.rows).toBeTruthy();
});

// ✅ GOOD: Mock SmartNgRX selectors before importing the component
vi.mock('../store/universe/selectors/select-universe.function', () => ({
  selectUniverse: vi.fn().mockReturnValue(signal([])),
}));

it('should render an empty table when no universe rows exist', async () => {
  await TestBed.configureTestingModule({
    imports: [UniverseTableComponent],
    providers: [provideSmartNgRX()],
  }).compileComponents();
  const fixture = TestBed.createComponent(UniverseTableComponent);
  fixture.detectChanges();

  const rows = fixture.nativeElement.querySelectorAll('tr[data-row]');
  expect(rows.length).toBe(0);
});
```

## Performance Considerations

When performing a code review, check for performance issues:

- **Database Queries**: Avoid N+1 queries, use proper indexing
- **Algorithms**: Appropriate time/space complexity for the use case
- **Caching**: Utilize caching for expensive or repeated operations
- **Resource Management**: Proper cleanup of connections, files, streams
- **Pagination**: Large result sets should be paginated
- **Lazy Loading**: Load data only when needed

### Examples

```typescript
// ❌ BAD: N+1 — separate Prisma query per universe row
const groups = await prisma.riskGroup.findMany();
for (const group of groups) {
  group.universe = await prisma.universe.findMany({
    // N+1!
    where: { riskGroupId: group.id },
  });
}

// ✅ GOOD: Single query with include
const groups = await prisma.riskGroup.findMany({
  include: { universe: true },
});
```

On the Angular frontend, avoid recomputing derived state on every render:

```typescript
// ❌ BAD: Inline filter called on every change-detection cycle
@Component({ template: `@for (row of rows().filter(activeOnly); track row.id) { ... }` })
export class UniverseTableComponent {
  rows = selectUniverse();
  activeOnly = (r: Universe) => !r.expired;
}

// ✅ GOOD: computed() runs only when the source signal changes
@Component({ template: `@for (row of activeRows(); track row.id) { ... }` })
export class UniverseTableComponent {
  private readonly rows = selectUniverse();
  activeRows = computed(
    function computeActiveRows() {
      return (this.rows() as Universe[]).filter((r) => !r.expired);
    }.bind(this)
  );
}
```

## Architecture and Design

When performing a code review, verify architectural principles:

- **Separation of Concerns**: Clear boundaries between layers/modules
- **Dependency Direction**: High-level modules don't depend on low-level details
- **Interface Segregation**: Prefer small, focused interfaces
- **Loose Coupling**: Components should be independently testable
- **High Cohesion**: Related functionality grouped together
- **Consistent Patterns**: Follow established patterns in the codebase

## Documentation Standards

When performing a code review, check documentation:

- **API Documentation**: Public APIs must be documented (purpose, parameters, returns)
- **Complex Logic**: Non-obvious logic should have explanatory comments
- **README Updates**: Update README when adding features or changing setup
- **Breaking Changes**: Document any breaking changes clearly
- **Examples**: Provide usage examples for complex features

## Comment Format Template

When performing a code review, use this format for comments:

```markdown
**[PRIORITY] Category: Brief title**

Detailed description of the issue or suggestion.

**Why this matters:**
Explanation of the impact or reason for the suggestion.

**Suggested fix:**
[code example if applicable]

**Reference:** [link to relevant documentation or standard]
```

### Example Comments

#### Critical Issue

````markdown
**🔴 CRITICAL - Security: SQL Injection Vulnerability**

The query on line 45 concatenates user input directly into the SQL string,
creating a SQL injection vulnerability.

**Why this matters:**
An attacker could manipulate the email parameter to execute arbitrary SQL commands,
potentially exposing or deleting all database data.

**Suggested fix:**

```sql
-- Instead of:
query = "SELECT * FROM users WHERE email = '" + email + "'"

-- Use:
PreparedStatement stmt = conn.prepareStatement(
    "SELECT * FROM users WHERE email = ?"
);
stmt.setString(1, email);
```

**Reference:** OWASP SQL Injection Prevention Cheat Sheet
````

#### Important Issue

````markdown
**🟡 IMPORTANT - Testing: Missing test coverage for critical path**

The `processPayment()` function handles financial transactions but has no tests
for the refund scenario.

**Why this matters:**
Refunds involve money movement and should be thoroughly tested to prevent
financial errors or data inconsistencies.

**Suggested fix:**
Add test case:

```javascript
test('should process full refund when order is cancelled', () => {
  const order = createOrder({ total: 100, status: 'cancelled' });

  const result = processPayment(order, { type: 'refund' });

  expect(result.refundAmount).toBe(100);
  expect(result.status).toBe('refunded');
});
```
````

#### Suggestion

````markdown
**🟢 SUGGESTION - Readability: Simplify nested conditionals**

The nested if statements on lines 30-40 make the logic hard to follow.

**Why this matters:**
Simpler code is easier to maintain, debug, and test.

**Suggested fix:**

```javascript
// Instead of nested ifs:
if (user) {
  if (user.isActive) {
    if (user.hasPermission('write')) {
      // do something
    }
  }
}

// Consider guard clauses:
if (!user || !user.isActive || !user.hasPermission('write')) {
  return;
}
// do something
```
````

## Review Checklist

When performing a code review, systematically verify:

### Code Quality

- [ ] Code follows consistent style and conventions
- [ ] Names are descriptive and follow naming conventions
- [ ] Functions/methods are small and focused
- [ ] No code duplication
- [ ] Complex logic is broken into simpler parts
- [ ] Error handling is appropriate
- [ ] No commented-out code or TODO without tickets

### Security

- [ ] No sensitive data in code or logs
- [ ] Input validation on all user inputs
- [ ] No SQL injection vulnerabilities
- [ ] Authentication and authorization properly implemented
- [ ] Dependencies are up-to-date and secure

### Testing

- [ ] New code has appropriate test coverage
- [ ] Tests are well-named and focused
- [ ] Tests cover edge cases and error scenarios
- [ ] Tests are independent and deterministic
- [ ] No tests that always pass or are commented out

### Performance

- [ ] No obvious performance issues (N+1, memory leaks)
- [ ] Appropriate use of caching
- [ ] Efficient algorithms and data structures
- [ ] Proper resource cleanup

### Architecture

- [ ] Follows established patterns and conventions
- [ ] Proper separation of concerns
- [ ] No architectural violations
- [ ] Dependencies flow in correct direction

### Documentation

- [ ] Public APIs are documented
- [ ] Complex logic has explanatory comments
- [ ] README is updated if needed
- [ ] Breaking changes are documented

## Project-Specific Customizations

### Angular Frontend (dms-material app)

- **When performing a code review, verify no RxJS is used** — Angular 20 signals are the mandatory reactive primitive. RxJS is only permitted in the `EffectService` implementations required by `@smarttools/smart-signals`.
- **When performing a code review, verify signals use named functions** — The `@smarttools/no-anonymous-functions` ESLint rule forbids anonymous/arrow functions. Use `computed(function myName() { ... }.bind(this))` and `effect(function myName() { ... }.bind(this))`.
- **When performing a code review, verify `computed()` is used for derived state, not `effect()`** — `effect()` is for side effects only.
- **When performing a code review, check SmartNgRX selector chains** — All selectors used inside `createSmartSignal` must themselves be Smart Signals; regular Angular signals cannot be mixed in.
- **When performing a code review, verify components use `OnPush` change detection** — New and modified Angular components must declare `changeDetection: ChangeDetectionStrategy.OnPush`.
- **When performing a code review, check component selectors use the `dms` prefix** — Angular components must use kebab-case selectors prefixed with `dms` (e.g., `dms-universe-table`).
- **When performing a code review, verify templates are in separate files** — `@angular-eslint/component-max-inline-declarations` enforces `template: 0, styles: 0, animations: 0`.
- **When performing a code review, verify PrimeNG and Tailwind CSS are used for UI** — Do not introduce other UI libraries.

### Backend (server app — Fastify + Prisma)

- **When performing a code review, verify Prisma parameterized queries are used** — Never use `prisma.$queryRaw` with string interpolation. Use typed Prisma client methods.
- **When performing a code review, check database safety** — Never run `prisma db push --force-reset`, `prisma migrate reset`, or any command that drops or truncates tables without explicit human approval.
- **When performing a code review, verify Fastify route handlers are typed** — All request/reply objects must have type parameters using Fastify's generic schema types.
- **When performing a code review, confirm `better-sqlite3` driver is used** — Do not switch to async Prisma drivers; the project uses synchronous SQLite in development.

### Testing

- **When performing a code review, verify tests use vitest** — The test runner is vitest (not Jest). Use `vi.mock(...)`, `vi.fn()`, `vi.spyOn(...)` for mocking.
- **When performing a code review, verify SmartNgRX selectors are mocked before import** — Use `vi.mock(...)` at the top of test files, before importing the component under test.
- **When performing a code review, check database test isolation** — Server tests that access the database must use a per-worker `DATABASE_URL` (e.g., `file:./test-database-{workerId}.db`) as documented in `docs/testing/database-test-isolation.md`.
- **When performing a code review, verify coverage thresholds** — Overall: 85% lines / 80% branches / 95% functions. Critical sync logic (`sync-from-screener/`): 95% lines, 100% for critical functions.
- **When performing a code review, confirm integration tests exist for new API endpoints** — Every new Fastify route needs at least one integration test using `supertest`.

### Build and Quality Gates

- **When performing a code review, verify `pnpm all` passes** — This runs lint + build + test for all projects. No PR should be merged if this fails.
- **When performing a code review, verify `pnpm dupcheck` passes** — Duplicate code is forbidden. Use `jscpd` output in `dupcheck-report/` to confirm.
- **When performing a code review, verify `pnpm format` has been run** — Prettier formatting must be applied before committing.
- **When performing a code review, check that Nx affected targets are used** — CI runs `pnpm nx affected -t lint,test,build`, so new projects must be properly registered in `nx.json`.

## Additional Resources

For more information on effective code reviews and GitHub Copilot customization:

- [GitHub Copilot Prompt Engineering](https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering)
- [GitHub Copilot Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Awesome GitHub Copilot Repository](https://github.com/github/awesome-copilot)
- [GitHub Code Review Guidelines](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [Google Engineering Practices - Code Review](https://google.github.io/eng-practices/review/)
- [OWASP Security Guidelines](https://owasp.org/)

## Prompt Engineering Tips

When performing a code review, apply these prompt engineering principles from the [GitHub Copilot documentation](https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering):

1. **Start General, Then Get Specific**: Begin with high-level architecture review, then drill into implementation details
2. **Give Examples**: Reference similar patterns in the codebase when suggesting changes
3. **Break Complex Tasks**: Review large PRs in logical chunks (security → tests → logic → style)
4. **Avoid Ambiguity**: Be specific about which file, line, and issue you're addressing
5. **Indicate Relevant Code**: Reference related code that might be affected by changes
6. **Experiment and Iterate**: If initial review misses something, review again with focused questions

## Project Context

- **Project**: DMS Workspace — a personal financial risk management system for trading Closed End Funds (CEFs) and ETFs
- **Frontend**: Angular 20 (standalone components, signals, `OnPush`), `@smarttools/smart-signals` (SmartNgRX) for state, PrimeNG + Angular Material (migration in progress) + Tailwind CSS for UI. **No RxJS outside SmartNgRX EffectServices.**
- **Backend**: Fastify + Prisma ORM, `better-sqlite3` driver for dev (SQLite), PostgreSQL for Docker/prod
- **Authentication**: Mock auth in dev/Docker, AWS Cognito in production
- **Build Tool**: pnpm + Nx monorepo
- **Testing**: vitest (unit + integration), Playwright (e2e). `TestBed` + `vi.mock()` for Angular component tests.
- **Code Style**: ESLint with `@angular-eslint`, `@smarttools/no-anonymous-functions`, and project-specific rules. Prettier for formatting.
- **Architecture**: refer to [docs/architecture/index.md](docs/architecture/index.md) for detailed architecture documentation
- **Coding Standards**: refer to [docs/architecture/coding-standards.md](docs/architecture/coding-standards.md) for mandatory rules

## Rate Limits

If GitHub Copilot rate limiting is detected or approached: (1) pause for at least 2 minutes before the next API call, (2) do not abort the task — resume from the last completed step after the pause, (3) prefer slow completion over fast failure.
