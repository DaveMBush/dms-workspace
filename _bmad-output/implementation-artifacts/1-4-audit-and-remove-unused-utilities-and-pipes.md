# Story 1.4: Audit and Remove Unused Utilities and Pipes

Status: Approved

## Story

As a developer,
I want to find and remove any standalone pipes, utility functions, or helper modules that are never imported or called,
so that the shared utilities are lean and directly purposeful.

## Acceptance Criteria

1. All pipes, pure functions, and shared utilities in the monorepo scanned for usages outside their own spec file.
2. Any utility with zero usages outside its own spec file is a removal candidate.
3. Candidates documented in `unused-code-audit.md` (utilities section).
4. Each removal validated with the full quality-check loop and committed individually.

## Tasks / Subtasks

- [ ] Enumerate all pipe and utility files in `dms-material` (AC: 1)
  - [ ] Find all `*.pipe.ts` files under `apps/dms-material/src/app/`
  - [ ] Find all `*.function.ts` / utility files under `apps/dms-material/src/app/`
  - [ ] Find exports in `apps/dms-material/src/test-utils/` that may be unused
- [ ] For each item, search for usages outside its own spec file (AC: 1, 2)
  - [ ] Grep for pipe name (TransformName) and pipe selector (`pipeName`) in `*.ts` and `*.html`
  - [ ] Grep for function/utility export names across the monorepo
  - [ ] Exclude: the item's own `*.spec.ts` file from "active usage"
- [ ] Add zero-usage items to `unused-code-audit.md` utilities section (AC: 3)
- [ ] For each candidate, apply the deletion validation loop (AC: 4)
  - [ ] Delete `{name}.pipe.ts` / `{name}.function.ts` **and** `{name}.pipe.spec.ts` / `{name}.function.spec.ts`
  - [ ] Run `pnpm all` → fail? restore + mark "verified active"
  - [ ] Run `pnpm e2e:dms-material:chromium` → fail? restore + mark "verified active"
  - [ ] Run `pnpm e2e:dms-material:firefox` → fail? restore + mark "verified active"
  - [ ] All pass → commit: `chore(cleanup): remove dead PipeName pipe` or `remove dead utilityName utility`

## Dev Notes

### File Naming Conventions for Pipes and Utilities

Per project-context.md file naming rules:

| Type          | Naming Pattern           | Example                       |
| ------------- | ------------------------ | ----------------------------- |
| Pipe          | `kebab-case.pipe.ts`     | `format-currency.pipe.ts`     |
| Pure function | `kebab-case.function.ts` | `calculate-yield.function.ts` |
| Constants     | `kebab-case.const.ts`    | `api-endpoints.const.ts`      |
| Types         | `kebab-case.types.ts`    | `account.types.ts`            |

### Pipe Usage Detection

Angular pipes can be used in templates or injected (rare). Check both:

```bash
# Find pipe class name usage (injected or imported)
grep -r "PipeName" apps/dms-material/src --include="*.ts" | grep -v ".spec.ts" | grep -v "pipe.ts"

# Find pipe selector usage in templates
grep -r "| pipeName" apps/dms-material/src --include="*.html"
```

A pipe imported in a component's `imports: []` array but never used in the template is also a dead import. ESLint `unused-imports/no-unused-imports` should catch these — but verify.

### Function/Utility Usage Detection

```bash
# Find a utility export across all files
grep -r "functionName\|importedName" apps/ --include="*.ts" | grep -v ".spec.ts"
```

### Test Utilities — Special Handling

Files in `apps/dms-material/src/test-utils/` are **only** used in test files. They exist solely for testing support. Do **not** remove test utilities — they are all "active" by definition. Scan for unused test utilities separately if needed, but do not remove them in this story.

### Per-Commit Validation Loop

Same loop as Stories 1.2 and 1.3 — one commit per deletion:

```
1. Delete {name}.pipe.ts + {name}.pipe.spec.ts  (or .function.ts + .function.spec.ts)
2. pnpm all → fail? restore + mark "verified active"
3. pnpm e2e:dms-material:chromium → fail? restore + mark "verified active"
4. pnpm e2e:dms-material:firefox → fail? restore + mark "verified active"
5. All pass → commit individually
```

### Commit Message Format

```
chore(cleanup): remove dead FormatCurrencyPipe pipe
chore(cleanup): remove dead calculateYield utility
```

### Audit Document Update

Add a new section to `_bmad-output/implementation-artifacts/unused-code-audit.md`:

```markdown
## Utilities & Pipes — Removal Candidates

- [ ] `apps/dms-material/src/app/shared/pipes/my-pipe.pipe.ts` — never used in templates

## Utilities & Pipes — Verified Active

- `apps/dms-material/src/app/shared/pipes/format-currency.pipe.ts` — used in 5 templates
```

### Quality Validation Commands

```bash
pnpm all                          # lint + build + unit tests
pnpm e2e:dms-material:chromium    # E2E Chromium
pnpm e2e:dms-material:firefox     # E2E Firefox
```

### Project Structure Notes

- Pipe files: `apps/dms-material/src/app/shared/` (most likely location)
- Utility functions: `apps/dms-material/src/app/shared/` or feature-specific directories
- Test utilities (`apps/dms-material/src/test-utils/`) — out of scope for removal
- Server utilities (`apps/server/src/app/utils/`) — out of scope for this epic

### References

- [Architecture §Implementation Patterns — Process Patterns](..//planning-artifacts/architecture.md) — per-commit deletion loop
- [Architecture §Implementation Patterns — Anti-patterns](..//planning-artifacts/architecture.md) — never batch-delete
- [Project Context §Code Quality — File Naming](../project-context.md)
- [Story 1.1](./1-1-audit-components-for-unused-declarations.md) — `unused-code-audit.md` format established here
- [Story 1.2](./1-2-remove-unused-components-batch.md) — deletion loop established here

## Dev Agent Record

### Agent Model Used

_to be filled by implementing agent_

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/unused-code-audit.md` (updated — utilities section added)
- Various deleted pipe/utility files (listed here after completion)
