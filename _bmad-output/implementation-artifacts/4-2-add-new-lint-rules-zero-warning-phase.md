# Story 4.2: Add New Lint Rules (Zero-Warning Phase)

Status: Approved

## Story

As a developer,
I want the new lint rules applied to the codebase with all violations auto-fixed or manually corrected,
so that `pnpm all` passes with the stricter rule set in place.

## Acceptance Criteria

1. All rules from the "Rules to Add" section of `lint-rules-diff.md` are added to `eslint.config.mjs`.
2. `pnpm lint --fix` is run and all auto-fixable violations are corrected.
3. Any remaining violations after auto-fix are resolved manually.
4. `pnpm all` passes with zero lint errors and zero lint warnings.

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/lint-rules-diff.md` — Section 1: Rules to Add (AC: 1)
- [ ] Add each new rule to `eslint.config.mjs` in the appropriate config block (AC: 1)
  - [ ] Install any new npm packages required by the new rules (add to `package.json` devDependencies)
  - [ ] Register new plugins in the `plugins` object if not already present
  - [ ] Add rules to the correct file-glob config block (`**/*.ts`, `**/*.html`, test files, etc.)
- [ ] Run `pnpm lint --fix` from the workspace root (AC: 2)
  - [ ] Confirm all auto-fixable violations are resolved
- [ ] Run `pnpm lint` (no `--fix`) and inspect remaining errors (AC: 3)
  - [ ] For each remaining violation: fix the source code manually
  - [ ] Do NOT suppress rules with `eslint-disable` comments unless the rule explicitly supports per-case suppression and the case is genuinely exceptional
- [ ] Run `pnpm all` and confirm it passes with zero errors and zero warnings (AC: 4)
- [ ] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` — confirm no regressions

## Dev Notes

### Prerequisite

Story 4.1 must be complete and `lint-rules-diff.md` must exist before starting this story.

### Config File Location

`eslint.config.mjs` at the workspace root. It uses **flat config** format (ESLint v9+). New rules must be added as flat config objects — do NOT use `.eslintrc` style.

### Adding Rules — Flat Config Pattern

```js
// Example: adding a rule to the shared TypeScript block
{
  files: ['**/*.ts'],
  rules: {
    'new-rule/rule-name': ['error', { option: true }],
  },
}
```

### Plugin Registration Pattern

If a new plugin is needed, add it to the top-level `plugins` block:

```js
{
  plugins: {
    // ... existing plugins ...
    'new-plugin': newPlugin,  // import at top of file
  },
}
```

### Install New Packages

```bash
pnpm add -D eslint-plugin-new-rule
```

Then import at the top of `eslint.config.mjs`:

```js
import newPlugin from 'eslint-plugin-new-rule';
```

### Lint Commands

```bash
# Auto-fix pass
pnpm lint --fix

# Check remaining violations
pnpm lint

# Full quality check
pnpm all
```

### Suppression Policy

- Prefer fixing violations in source code over suppressing.
- If a rule must be suppressed for a specific case, use the narrowest possible scope:
  ```ts
  // eslint-disable-next-line rule-name -- reason why this is acceptable
  ```
- Never add a file-level or project-level disable without team discussion.
