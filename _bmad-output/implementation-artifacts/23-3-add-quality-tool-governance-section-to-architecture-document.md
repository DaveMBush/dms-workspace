# Story 23.3: Add Quality Tool Governance Section to Architecture Document

Status: Approved

## Story

As a developer,
I want the architecture document to include a Quality Tool Governance section,
so that the rules for configuring and maintaining `jscpd`, `vitest` coverage, and other quality enforcement tools are clearly documented and enforceable.

## Acceptance Criteria

1. **Given** the architecture document at `_bmad-output/planning-artifacts/architecture.md`, **When** the Quality Tool Governance section is added, **Then** it includes: the accepted tools list, configuration rules (no invalid paths, no suppression of real violations), and coverage threshold requirements (100% branch coverage).
2. **Given** the section is written, **When** a future developer reads it, **Then** they can determine: which quality tools are active, how each is configured, and what constitutes a violation of each tool's governance rules.
3. **Given** the document update, **When** `pnpm format` is run, **Then** the markdown file passes formatting without errors.

## Definition of Done

- [ ] Quality Tool Governance section added to `_bmad-output/planning-artifacts/architecture.md`
- [ ] Section covers: jscpd (duplication), vitest (coverage), eslint (linting), and any other active quality gates
- [ ] Rules for each tool clearly described (what is allowed vs. not allowed)
- [ ] Run `pnpm format`
- [ ] Repeat if any fails until it passes

## Tasks / Subtasks

- [ ] Review current architecture document structure (AC: #1)
  - [ ] Read `_bmad-output/planning-artifacts/architecture.md` to find appropriate insertion point
  - [ ] Identify existing quality-related sections (if any) to avoid duplication
- [ ] Draft Quality Tool Governance section (AC: #1, #2)
  - [ ] Add `## Quality Tool Governance` (or equivalent heading level) section
  - [ ] Write sub-section for **jscpd** (duplication checker):
    - Config file: `.jscpd.json`
    - Rule: all ignore paths must point to existing files; invalid paths must be removed
    - Rule: duplication violations must be resolved by refactoring, never by adding suppressions
  - [ ] Write sub-section for **Vitest coverage**:
    - Config file: `vitest.config.ts`
    - Required threshold: `100` for `branches` globally
    - Rule: `/* v8 ignore */` comments are only permitted for provably unreachable branches, with an explanatory comment
    - Rule: the `exclude` list in the coverage config must not be modified to hide gaps
  - [ ] Write sub-section for **ESLint**:
    - Config file: `eslint.config.mjs`
    - Rule: `eslint-disable` suppression comments require a brief justification comment
  - [ ] Include a **Governance Enforcement** paragraph explaining that `pnpm all` runs all checks and all checks must pass before a story is considered done
- [ ] Insert section into document (AC: #1)
  - [ ] Place after the existing "Testing Strategy" or "Architecture Decisions" section (whichever is more appropriate)
- [ ] Validate document (AC: #3)
  - [ ] Run `pnpm format` and confirm no errors

## Dev Notes

### Key Files

- `_bmad-output/planning-artifacts/architecture.md` — document to update
- `vitest.config.ts` — current coverage config (for reference)
- `.jscpd.json` — current duplication config (for reference)
- `eslint.config.mjs` — current ESLint config (for reference)

### Style Guidelines

- Match the heading level and Markdown style already used in `architecture.md`
- Do not rewrite existing sections; only add the new Quality Tool Governance section
- Keep the section factual and prescriptive (rules), not tutorial-style

### References

[Source: _bmad-output/planning-artifacts/architecture.md]
[Source: vitest.config.ts]
[Source: .jscpd.json]
[Source: eslint.config.mjs]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
