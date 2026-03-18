# Story 1.3: Audit Services for Unused Registrations

Status: Approved

## Story

As a developer,
I want to identify services that are registered but never injected anywhere active,
so that I can remove them safely without breaking any functionality.

## Acceptance Criteria

1. All `@Injectable` services in `dms-material` scanned for active injection sites.
2. Services with zero active injection sites added to a "services" section of the removal candidates list in `unused-code-audit.md`.
3. Each removal candidate validated and committed individually using the same quality-check loop as Story 1.2.

## Tasks / Subtasks

- [ ] Enumerate all service files under `apps/dms-material/src/app/` (AC: 1)
  - [ ] Collect every `.ts` file containing `@Injectable`
  - [ ] Record class name and `providedIn` value for each
- [ ] For each service, search for active injection sites (AC: 1)
  - [ ] Search for `inject(ServiceClassName)` in all `*.ts` files
  - [ ] Search for `ServiceClassName` in all providers arrays
  - [ ] Exclude: the service's own spec file and any mock files
- [ ] Services with zero active injection sites → add to `unused-code-audit.md` services section (AC: 2)
- [ ] For each service candidate, apply the deletion validation loop (AC: 3)
  - [ ] Delete `{service-name}.service.ts` and `{service-name}.service.spec.ts`
  - [ ] Run `pnpm all` → fail? restore + mark "verified active"
  - [ ] Run `pnpm e2e:dms-material:chromium` → fail? restore + mark "verified active"
  - [ ] Run `pnpm e2e:dms-material:firefox` → fail? restore + mark "verified active"
  - [ ] All pass → commit: `chore(cleanup): remove dead ServiceName`

## Dev Notes

### Service Detection Pattern

Angular 21 uses `inject()` exclusively in this project — no constructor injection. Search pattern:

```bash
# Find all Injectable services
grep -rl "@Injectable" apps/dms-material/src --include="*.ts"

# Check if a service is used anywhere (example)
grep -r "inject(MyService)\|MyService" apps/dms-material/src \
  --include="*.ts" \
  --include="*.html" \
  | grep -v ".spec.ts" \
  | grep -v "my.service.ts"
```

### Active Injection Site Definition

A service is **active** if it is referenced in any of:

- `inject(ServiceClass)` in any non-spec `.ts` file
- `providers: [ServiceClass]` or `{ provide: ServiceClass, ... }` in any component/route config
- `TestBed.configureTestingModule({ providers: [ServiceClass] })` does **not** count as active usage

A service is a **candidate** only if it has zero active injection sites outside of:

- Its own spec file (`*.service.spec.ts`)
- Mock/stub test helper files

### DI Pattern Reminder

This project uses `inject()` exclusively:

```ts
// CORRECT — how to check for active usage
private readonly myService = inject(MyService);

// WRONG — constructor injection doesn't exist in this project
constructor(private myService: MyService) {} // won't be found
```

Since constructor injection is not used, a simple grep for `inject(ClassName)` is sufficient.

### Per-Commit Validation Loop (same as Story 1.2)

```
For each service candidate:
  1. Delete {name}.service.ts and {name}.service.spec.ts
  2. pnpm all → fail? restore + mark "verified active"
  3. pnpm e2e:dms-material:chromium → fail? restore + mark "verified active"
  4. pnpm e2e:dms-material:firefox → fail? restore + mark "verified active"
  5. All pass → commit: chore(cleanup): remove dead ServiceName
```

**Never batch-delete multiple services in one commit.**

### Audit Document Update

Add a new section to `unused-code-audit.md` (from Story 1.1):

```markdown
## Services — Removal Candidates

- [ ] `apps/dms-material/src/app/demo/demo.service.ts` — class `DemoService`, no active inject() calls

## Services — Verified Active

- `apps/dms-material/src/app/global/services/my-service.service.ts` — used in 3 components
```

### Known Server-Side Services — Out of Scope

Services under `apps/server/src/app/services/` are **not** in scope for this story. This epic is `dms-material` only.

Also note: `apps/server/src/` contains several benchmark and performance monitoring services that may look unused — do not touch these.

### Quality Validation Commands

```bash
pnpm all                          # lint + build + unit tests
pnpm e2e:dms-material:chromium    # E2E Chromium
pnpm e2e:dms-material:firefox     # E2E Firefox
```

### Project Structure Notes

- Service files: `apps/dms-material/src/app/**/{name}.service.ts`
- Services in `apps/dms-material/src/app/global/services/` — verify carefully, may be used by multiple features
- `_bmad-output/implementation-artifacts/unused-code-audit.md` — add services section here (don't create a new file)

### References

- [Architecture §Implementation Patterns — Process Patterns](..//planning-artifacts/architecture.md) — per-commit deletion loop
- [Architecture §Implementation Patterns — Anti-patterns](..//planning-artifacts/architecture.md) — never batch-delete
- [Project Context §Angular — Dependency Injection](../project-context.md) — `inject()` pattern
- [Story 1.1](./1-1-audit-components-for-unused-declarations.md) — `unused-code-audit.md` produced here
- [Story 1.2](./1-2-remove-unused-components-batch.md) — same deletion loop established here

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/unused-code-audit.md` (updated — services section added and candidates checked off)
- Various deleted service files (listed here after completion)
