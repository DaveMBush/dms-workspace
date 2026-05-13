# Story 103.1: Investigate the Shared Add-Symbol Validator and the Polarity Bug

Status: Approved

**Story Key:** `103-1-investigate-add-symbol-validator-polarity`
**Epic:** 103 — Add New Symbol on Universe Screen (Validation Polarity Fix)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 103.1)
**Type:** Investigation (code-only audit + Playwright MCP reproduction; no production code or tests changed)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a documented investigation of exactly which validator(s) the Universe *Add Symbol* modal
and the Open Positions *Add* modal use, where each "is symbol in universe?" check lives, and
which polarity each caller actually needs,
So that Story 103.2 applies a precise, surgical fix that handles both call sites correctly
rather than guessing at the shape of the (possibly shared, possibly duplicated) code.

## Epic Context

**Epic 103 Goal:** The "Add" button in the Universe screen's *Add Symbol* modal never enables,
even after Dave fills in a valid new symbol. The epic hypothesises that the modal shares a
validator with the Open Positions *Add* modal but with the wrong polarity:

- **Open Positions Add:** "Add" should enable only when the symbol IS already in the Universe
  (currently correct).
- **Universe Add:** "Add" should enable only when the symbol is NOT already in the Universe
  (currently broken — button stays disabled for new symbols).

This story (103.1) is the **investigation/diagnosis** story. It must:

1. Reproduce both modal behaviours via Playwright MCP.
2. Identify the actual validator code path each modal uses (shared or not).
3. Pinpoint the failing layer so Story 103.2 can apply a surgical fix without regressing the
   Open Positions Add modal.

**No production code is modified in this story.**

## Acceptance Criteria

1. **AC1 — Universe Add bug reproduced via Playwright MCP.**
   **Given** the Universe screen's *Add Symbol* modal,
   **When** the developer reproduces the bug via the Playwright MCP server (open modal, fill in
   a symbol that is NOT in the universe, observe that "Add" stays disabled),
   **Then** Dev Notes record the screenshot/observation **and** the form's validation state at
   that moment (which control(s) are reporting `invalid`, and with which error key — e.g.
   `required`, `pattern`, `duplicate`, `invalidSymbol`).

2. **AC2 — Open Positions Add correct behaviour reproduced via Playwright MCP.**
   **Given** the Open Positions *Add* modal,
   **When** the developer reproduces its current correct behaviour via Playwright MCP (open
   modal, fill in a symbol that IS in the universe — "Add" enables; fill in one that is NOT —
   "Add" stays disabled),
   **Then** Dev Notes record both observations and the form validation state for each.

3. **AC3 — Validator location, predicate, and callers documented.**
   **Given** both modals have been exercised,
   **When** the developer locates the validator code (the epic hypothesises a shared validator
   under `apps/dms-material/src/app/.../validators/`; the investigation must confirm or refute
   that hypothesis — see Dev Notes for the current code reality),
   **Then** Dev Notes record:
   - (a) the file path(s) and exported symbol(s) of the validator(s) actually used by each modal,
   - (b) the exact predicate each one applies (when does it return an error vs. `null`?),
   - (c) every caller of each validator in the codebase (full path + line),
   - (d) the polarity each caller needs vs. the polarity it currently gets.

4. **AC4 — Failing layer explicitly identified.**
   **Given** the validator(s) are identified,
   **When** the developer reviews how each modal wires validation into the form **and** how
   each modal computes its submit-disabled state,
   **Then** Dev Notes state explicitly which of these is the broken layer (one or more):
   - (i) the validator itself has the wrong polarity for one caller;
   - (ii) the validator is correct but one caller is mis-wiring it;
   - (iii) the modals share a single instance that cannot serve both polarities and must be
     parameterised / split;
   - (iv) the validator is correct but a *different* gate (e.g. `selectedSymbol`,
     autocomplete-selection requirement) is what actually disables the button — a
     non-validator root cause.

5. **AC5 — Recommendation handed off to Story 103.2.**
   **Given** the failing layer is identified,
   **When** the developer writes a "Recommendation for Story 103.2" subsection in Dev Notes,
   **Then** that subsection states the smallest viable fix shape (parameterise validator,
   split into two validators, change a gate other than the validator, etc.) **and** lists the
   exact files Story 103.2 will need to touch.

6. **AC6 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass (no production code is modified in this story).

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce Universe Add bug with Playwright MCP** (AC: #1)
  - [ ] Start the local dev stack (`./scripts/start-local-dev.sh` or `pnpm nx serve …`) and
        ensure the Universe screen loads with at least one existing symbol.
  - [ ] Use the Playwright MCP server to open the *Add Symbol to Universe* modal, type a
        symbol that is NOT already in the Universe (e.g. `ZZZZ`), choose a Risk Group, and
        observe that the "Add Symbol" button stays disabled.
  - [ ] In the same Playwright session, capture the form's validation state at that moment:
        which control(s) are `invalid`, the value of `errors`, the value of `selectedSymbol`,
        and whether the submit-disabled signal is gated by a validator error or by a separate
        condition (see Dev Notes — `isSubmitDisabled` is gated on `selectedSymbol()`).
  - [ ] Save screenshots and the captured state into the Dev Notes "Reproduction — Universe
        Add" subsection.

- [ ] **Task 2 — Reproduce Open Positions Add behaviour with Playwright MCP** (AC: #2)
  - [ ] In the same dev stack, navigate to an account with the Open Positions panel and open
        the *Add Position* modal.
  - [ ] Type a symbol that IS already in the Universe — confirm "Add" enables. Capture form
        validation state.
  - [ ] Type a symbol that is NOT in the Universe — confirm "Add" stays disabled and the
        modal surfaces the existing error. Capture form validation state.
  - [ ] Save screenshots and captured state into Dev Notes "Reproduction — Open Positions
        Add" subsection.

- [ ] **Task 3 — Locate the validator(s) and enumerate callers** (AC: #3)
  - [ ] Search the `apps/dms-material/src/app/` tree for symbol-existence validators
        (suggested patterns: `symbolExistsValidator`, `duplicateSymbolValidator`,
        `Validator.*Symbol`, `isInUniverse`, `notInUniverse`, `validators/`).
  - [ ] For each validator found, record: file path, exported symbol / method name,
        predicate (when does it return `null` vs an error?), and the error key it emits.
  - [ ] Use `vscode_listCodeUsages` (or grep) to enumerate every caller of each validator in
        the codebase, including unit-test setups. Record path + line for each.
  - [ ] If the epic's "shared validator" hypothesis turns out to be false (two independent
        validators in two modals — see Dev Notes for current state), record that explicitly
        and explain how each modal arrived at its current behaviour.

- [ ] **Task 4 — Diagnose the actual failing layer** (AC: #4)
  - [ ] Map each modal's "submit disabled" computation to its inputs (validator state,
        autocomplete-selection state, loading state, other form controls).
  - [ ] For the Universe Add modal specifically, determine whether the disabled "Add" button
        is caused by a validator returning an error on a valid new symbol, or by a *different*
        gate (e.g. `selectedSymbol` only being set when the user picks an autocomplete option,
        not when they type a free-text symbol). See Dev Notes — this is a strong candidate.
  - [ ] Classify the root cause as one of (i)–(iv) in AC4 above and cite the line(s) of
        evidence from the reproduction (Tasks 1–2) and the code (Task 3).

- [ ] **Task 5 — Recommendation for Story 103.2** (AC: #5)
  - [ ] Write a "Recommendation for Story 103.2" subsection in Dev Notes that:
        - States the smallest viable fix shape (parameterise validator, split into two,
          change a non-validator gate, etc.).
        - Lists every file Story 103.2 will need to touch, with a one-line description of the
          change required in each.
        - Notes any test files (unit + Playwright) that will need updating in 103.2/103.3 so
          they match the new behaviour.

- [ ] **Task 6 — Quality gate** (AC: #6)
  - [ ] Confirm no production source files were modified (only this story file's Dev Notes
        was updated).
  - [ ] Run `pnpm all` and confirm all tests pass. Record the result in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

The investigation must touch two modals and the validator(s) backing each. Concrete starting
points (verified by code search at story-creation time — confirm during investigation):

#### Universe Add modal

- **Component:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- **Template:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html)
- **Tests:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts)
- **Symbol validator (current):** Local method `duplicateSymbolValidator()` defined inside
  `AddSymbolDialogComponent`. Returns `{ duplicate: { value } }` when the typed symbol IS
  already in the Universe; returns `null` otherwise. **This is the correct polarity for this
  modal** ("must NOT be in Universe").
- **Submit-disabled signal (current):**
  ```ts
  isSubmitDisabled = computed(() => this.isLoading() || !this.selectedSymbol());
  ```
  Note: this gate is **not** the validator — it requires `selectedSymbol` to be non-null.
  `selectedSymbol` is set only via `onSymbolSelected(symbol)`, which is wired to the
  `(symbolSelected)` output of `<dms-symbol-autocomplete>`.

#### Open Positions Add modal

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- **Symbol validator (current):** Local method `symbolExistsValidator(control)` defined
  inside `AddPositionDialogComponent`. Returns `{ invalidSymbol: true }` when the typed
  symbol does NOT match any Universe row; returns `null` otherwise. **This is the correct
  polarity for this modal** ("must BE in Universe").
- **Other call sites of `symbolExistsValidator`:** [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts) (line 116) — note this is a **different** local method on a
  different component, not the same function. Confirm during investigation.

### Important context — verify the epic's premise

A code search at story-creation time (May 2026) shows the two modals do **not** import a
shared validator:

- Universe Add uses a private method `duplicateSymbolValidator()` (returns error when symbol
  IS in Universe).
- Open Positions Add uses a private method `symbolExistsValidator()` (returns error when
  symbol is NOT in Universe).

These are two independent methods on two independent components, **already in opposite
polarities**, and each method's polarity matches what its modal needs. If the bug truly is
"Add stays disabled on Universe Add for a valid new symbol", the validator is unlikely to be
the proximate cause.

The strong candidate root cause to investigate first is the submit-disabled gate:

```ts
isSubmitDisabled = isLoading() || !selectedSymbol();
```

`selectedSymbol` is only set when the user clicks an autocomplete option. If a user types
`ZZZZ` (not in any autocomplete result because it's not in the Universe and not returned by
`SymbolSearchService`), they may never get an autocomplete selection to click, leaving
`selectedSymbol` `null` and the button permanently disabled — regardless of validator state.

This story's job is to **confirm or refute** that hypothesis with reproduction evidence and
direct code reading, and then write the recommendation for 103.2 accordingly. Do **not**
assume — verify.

### Reproduction tooling

- Playwright MCP server is the required reproduction tool (per epic AC1, AC2). Capture
  screenshots and form-state snapshots — do not paraphrase.
- For inspecting Angular form validation state at runtime, the cleanest approach is a
  short-lived `eval` via Playwright MCP that reads the form's `errors`, `status`, and the
  component's exposed signals. Record the exact snippet used and its output in Dev Notes.

### Testing standards

- **No new tests in this story** — Story 103.3 owns regression coverage. This story only
  reads code and the running app; no production source files or test files are modified.
- `pnpm all` (lint + format + unit + build, per repo convention) must pass at the end. This
  is mostly a no-op gate for an investigation story but proves nothing was inadvertently
  modified.

### Project Structure Notes

- Both modals live in `apps/dms-material/src/app/` under their respective feature folders
  (`universe-settings/`, `account-panel/open-positions/`). No shared `validators/` folder
  exists for these methods at story-creation time — if Story 103.2 chooses to extract a
  shared, parameterised validator, that introduces a new structural element and should be
  called out in 103.2's story file.
- Project conventions (Angular 21 zoneless, signal-first, `OnPush`, reactive forms) per
  `_bmad-output/project-context.md`. Both modals already follow these conventions.

### Related Prior Work

- **Epic 100** — Universe row delete bug. Same screen, but separate code path; the delete
  trigger lives on the row's trash-can icon, not the Add modal. Mentioned only as context.
- **Story 89.1 / 89.2** — Add-symbol CEF-expired bug fixes. Touched the Universe Add code
  path. Worth a quick git log scan to see if those fixes accidentally introduced or
  surfaced the current "Add stays disabled" behaviour.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Story 103.1 section
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Universe Add component: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- Open Positions Add component: [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)

## Dev Agent Record

### Agent Model Used

(to be filled in by the dev agent)

### Debug Log References

### Completion Notes List

### File List
