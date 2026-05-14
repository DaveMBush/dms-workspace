# Story 103.2: Fix Universe Add Modal Validation Without Regressing Open Positions Add

Status: In Progress

**Story Key:** `103-2-fix-universe-add-validator-polarity`
**Epic:** 103 — Add New Symbol on Universe Screen (Validation Polarity Fix)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 103.2)
**Type:** Implementation
**Depends on:** Story 103.1 (investigation) — [_bmad-output/implementation-artifacts/103-1-investigate-add-symbol-validator-polarity.md](103-1-investigate-add-symbol-validator-polarity.md)
**Enables:** Story 103.3 (E2E regression test)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want the Universe screen's *Add Symbol* modal's "Add" button to enable as soon as I have
entered a valid new symbol that is NOT already in the Universe (along with whatever other
required fields the modal needs),
So that I can actually add new symbols to my Universe instead of being permanently blocked by
the disabled button.

## Epic Context

**Epic 103 Goal:** The "Add" button in the Universe screen's *Add Symbol* modal never enables,
even after Dave fills in a valid new symbol. The Open Positions *Add* modal currently behaves
correctly ("Add" enables only when the symbol IS already in the Universe). The Universe Add
modal needs the opposite ("Add" enables only when the symbol is NOT already in the Universe).
Story 103.1 investigated the failing layer; this story (103.2) applies the surgical fix.

**Critical premise correction from Story 103.1:** The epic hypothesised a single shared
validator with the wrong polarity for one caller. The investigation in 103.1 found that the
two modals already use **two independent local validators with the correct polarities for
their respective modals**:

- `AddSymbolDialogComponent.duplicateSymbolValidator()` returns `{ duplicate: { value } }`
  when the typed symbol IS in the Universe — correct for Universe Add ("must NOT be in
  Universe").
- `AddPositionDialogComponent.symbolExistsValidator()` returns `{ invalidSymbol: true }` when
  the typed symbol is NOT in the Universe — correct for Open Positions Add ("must BE in
  Universe").

Therefore the actual broken layer is **not** the validator. It is the Universe Add modal's
**submit-disabled gate**:

```ts
// apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts
isSubmitDisabled = computed(() => this.isLoading() || !this.selectedSymbol());
```

`selectedSymbol` is set **only** via `onSymbolSelected(symbol)`, wired to the
`(symbolSelected)` output of `<dms-symbol-autocomplete>`. Autocomplete results come from
`SymbolSearchService`, which returns symbols that exist in the system's symbol catalogue
(not the user's Universe). For the Universe Add use case the user is, by design, typing a
symbol that is **not yet** in their Universe — so they may or may not get an autocomplete
match to click. If they do not click an autocomplete option (or no option exists for a
valid free-text ticker), `selectedSymbol` remains `null` and the button is permanently
disabled regardless of the form's validity.

**This story's fix targets that gate.** The validator polarity is already correct in both
modals; the AC wording from the epic about "parameterising or splitting the shared
validator" is satisfied by the (verified) fact that two independent intention-named
validators already exist. The implementation must make the Universe Add submit gate depend
on the form's actual validity (and any genuinely required fields), **not** on
`selectedSymbol`. See Tasks below.

## Acceptance Criteria

1. **AC1 — Validator polarity matches modal intent (no shared-validator regression).**
   **Given** the two existing local validators (`duplicateSymbolValidator` on
   `AddSymbolDialogComponent` and `symbolExistsValidator` on `AddPositionDialogComponent`),
   **When** the developer reviews them after the fix,
   **Then** each call site uses an intention-named validator with the polarity it needs:
   Universe Add → "must NOT be in Universe", Open Positions Add → "must BE in Universe".
   The fix must NOT duplicate-and-diverge the predicate, and must NOT special-case by route
   inside a single shared function. (If the dev chooses to extract a shared, parameterised
   helper such as `symbolInUniverseValidator({ mustBe: true | false })`, that is acceptable
   provided both call sites use intention-revealing names at the call site.)

2. **AC2 — Universe Add: button enables for a valid new symbol.**
   **Given** the Universe *Add Symbol* modal after the fix,
   **When** Dave opens it and types a symbol that is NOT already in the Universe, that
   matches the symbol-format pattern (`^[A-Z]{1,5}$`), and selects a Risk Group,
   **Then** the "Add Symbol" button enables — even if the user did not click an autocomplete
   suggestion.

3. **AC3 — Universe Add: button stays disabled for a duplicate symbol.**
   **Given** the Universe *Add Symbol* modal after the fix,
   **When** Dave types a symbol that IS already in the Universe,
   **Then** the "Add Symbol" button stays disabled and the form surfaces the existing
   `duplicate` error using the modal's existing convention (the existing
   `symbolDuplicateError` computed signal and template error markup).

4. **AC4 — Open Positions Add: no regression for in-universe symbol.**
   **Given** the Open Positions *Add Position* modal after the fix,
   **When** Dave types a symbol that IS in the Universe (and fills the other required
   fields),
   **Then** the "Add" / "Save" button enables exactly as it does today.

5. **AC5 — Open Positions Add: no regression for not-in-universe symbol.**
   **Given** the Open Positions *Add Position* modal after the fix,
   **When** Dave types a symbol that is NOT in the Universe,
   **Then** the "Add" / "Save" button stays disabled and the existing `invalidSymbol` error
   is surfaced exactly as it is today.

6. **AC6 — All other validation rules on each modal continue to behave exactly as today
   (NFR7).**
   **Given** the other validators on each modal — `Validators.required` and the symbol
   `^[A-Z]{1,5}$` pattern on Universe Add; `required`, quantity-pattern, price-pattern,
   min-value, and `purchase_date` required on Open Positions Add,
   **When** the user exercises each rule (empty field, invalid pattern, below-min, etc.),
   **Then** the resulting enable/disable behaviour and error messaging are unchanged from
   today.

7. **AC7 — Both modals visually verified via Playwright MCP.**
   **Given** the fix is in place,
   **When** the developer drives both modals via the Playwright MCP server,
   **Then** screenshots and form-state snapshots in Dev Notes confirm AC2–AC5 hold in the
   running app (not just in unit tests).

8. **AC8 — Quality gate.**
   **Given** all changes are committed,
   **When** `pnpm all` runs,
   **Then** lint, format, build, and unit tests all pass. Existing unit tests for both
   dialog components must continue to pass; if any existing test asserted the old (broken)
   `isSubmitDisabled` behaviour for Universe Add, update that test to assert the new correct
   behaviour and document the change in Dev Notes.

## Tasks / Subtasks

- [ ] **Task 1 — Re-read the 103.1 investigation findings** (AC: #1, #2)
  - [x] Read [103-1-investigate-add-symbol-validator-polarity.md](103-1-investigate-add-symbol-validator-polarity.md)
        Dev Notes in full, especially the "Recommendation for Story 103.2" subsection.
  - [x] Confirm in this story's Dev Notes that the recommendation matches the plan in this
        story file. If 103.1's recommendation differs (e.g. it pinpoints a different broken
        layer), STOP and `correct-course` before changing code.

- [x] **Task 2 — Fix the Universe Add submit-disabled gate** (AC: #2, #3, #6)
  - [x] Open [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts).
  - [x] Replace the current `isSubmitDisabled` computation:
        ```ts
        isSubmitDisabled = computed(() => this.isLoading() || !this.selectedSymbol());
        ```
        with a gate that depends on `this.form.valid` (and `isLoading`), so that any
        symbol satisfying `Validators.required`, the `^[A-Z]{1,5}$` pattern, AND
        `duplicateSymbolValidator()` enables submission together with a chosen Risk Group.
        Do **not** require `selectedSymbol` for submit-enable; `selectedSymbol` is a
        UX-helper signal for the autocomplete, not a precondition for adding a symbol the
        user typed by hand.
  - [x] Ensure `onSubmit()` continues to work when the user submits a free-text symbol
        (without ever picking an autocomplete option). The current `onSubmit()` reads
        `this.form.value.symbol` and `riskGroupId` directly — verify it still constructs a
        valid POST body in that path. If the current code path relies on `selectedSymbol`
        anywhere downstream of submit, audit and fix.
  - [x] Confirm `addSymbolToUniverse(symbol, riskGroupId)` and the existing
        409-handling-already-exists notification path still trigger correctly when the
        backend rejects a now-duplicate symbol (race condition between client validator and
        backend).

- [x] **Task 3 — Validator-shape decision** (AC: #1)
  - [x] Decide whether to leave the two existing local validators in place (already
        intention-named: `duplicateSymbolValidator`, `symbolExistsValidator`) OR extract a
        single parameterised helper. Either is acceptable per AC1; the criterion is "no
        duplicate-and-diverge, no route-special-casing".
  - [x] If extracting a helper, place it under
        `apps/dms-material/src/app/shared/validators/` (create the folder if it does not
        exist — note this is a new structural element; record it in Dev Notes "Project
        Structure Notes"). Export two intention-named wrappers (e.g.
        `symbolMustNotBeInUniverse` and `symbolMustBeInUniverse`) and replace the local
        methods on each component with calls to those wrappers.
  - [x] If leaving the locals in place, add a brief code comment on each method linking the
        sibling method by file path so that future maintainers see the pair.

- [x] **Task 4 — Verify Open Positions Add is untouched in behaviour** (AC: #4, #5, #6)
  - [x] Read [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
        in full to confirm the fix in Task 2 does not require any change here.
  - [x] If Task 3 chose the "extract a shared helper" path, replace
        `symbolExistsValidator` here with `symbolMustBeInUniverse` and confirm error key
        compatibility (the existing template/test references `invalidSymbol`; either preserve
        that key in the new helper or update the template + tests in lock-step).

- [x] **Task 5 — Update or add unit tests for the Universe Add dialog** (AC: #2, #3, #6, #8)
  - [x] Open [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts).
  - [x] If any existing test asserted that `isSubmitDisabled` was true while
        `selectedSymbol` was null even with a fully valid form, update that test to assert
        the new correct behaviour (button enabled when form is valid + risk group chosen,
        regardless of `selectedSymbol`).
  - [x] Add or extend tests covering:
        - Valid free-text symbol + risk group → `isSubmitDisabled` is false.
        - Duplicate symbol typed → `isSubmitDisabled` is true and `symbolDuplicateError`
          fires.
        - Empty symbol or invalid pattern → `isSubmitDisabled` is true and the appropriate
          error signal fires.
        - Missing risk group → `isSubmitDisabled` is true.

- [x] **Task 6 — Confirm Open Positions Add unit tests still pass without modification**
      (AC: #4, #5, #6, #8)
  - [x] If Task 3 chose the "extract a shared helper" path AND the helper uses a different
        error key, update the Open Positions Add unit tests to match. Otherwise, leave
        unchanged.

- [ ] **Task 7 — Playwright MCP visual verification** (AC: #7)
  - [ ] Start the local dev stack (e.g. `./scripts/start-local-dev.sh`).
  - [ ] Drive the Universe *Add Symbol* modal via Playwright MCP: type a symbol NOT in the
        Universe, choose a risk group, observe "Add Symbol" enabled, capture a screenshot.
  - [ ] Drive it again with a duplicate symbol; observe button disabled and the duplicate
        error visible; capture a screenshot.
  - [ ] Drive the Open Positions *Add Position* modal via Playwright MCP: confirm an
        in-universe symbol enables Save and a not-in-universe symbol disables it with the
        existing error shown; capture screenshots.
  - [ ] Save all screenshots and form-state snapshots into Dev Notes "Playwright MCP
        verification" subsection.

- [ ] **Task 8 — Quality gate** (AC: #8)
  - [ ] Run `pnpm format`.
  - [ ] Run `pnpm all` and confirm lint, build, and all unit tests pass. Record the result
        in Dev Notes.
  - [ ] If any duplication check (`pnpm dupcheck` if it is part of the gate) flags the new
        validator helper, address by extracting the shared helper as in Task 3.

## Dev Notes

### Architecture & Code Pointers

#### Universe Add modal (the one being fixed)

- **Component:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- **Template:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html)
- **Tests:** [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts)
- **Current validator (correct polarity, leave alone unless extracting):**
  `duplicateSymbolValidator()` — returns `{ duplicate: { value } }` when the typed symbol
  IS in the Universe; returns `null` otherwise. Sourced from `existingSymbols`, which is a
  computed signal over `selectUniverses()`.
- **Current submit-disabled gate (THE BUG):**
  ```ts
  isSubmitDisabled = computed(
    function isSubmitDisabled(this: AddSymbolDialogComponent) {
      return this.isLoading() || !this.selectedSymbol();
    }.bind(this)
  );
  ```
- **Required fix shape:**
  ```ts
  isSubmitDisabled = computed(
    function isSubmitDisabled(this: AddSymbolDialogComponent) {
      return this.isLoading() || this.form.invalid;
    }.bind(this)
  );
  ```
  (Or an equivalent computation derived from `form.statusChanges` if the dev prefers a
  signal-friendly bridge — but the form is created synchronously in the field initializer
  and a `computed(() => this.form.invalid)` already re-evaluates because the underlying
  form-status changes propagate via `markForCheck` on the OnPush component. Verify with
  Playwright MCP per Task 7.)
- **Note on `selectedSymbol` after the fix:** keep `selectedSymbol` and
  `onSymbolSelected()` as a UX helper for the autocomplete (it still drives display values
  like `symbolName`/`symbolValue` via computed signals). Do not delete it; just stop using
  it as a submit-enable precondition.

#### Open Positions Add modal (must NOT regress)

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- **Validator:** `symbolExistsValidator()` (private method) — returns
  `{ invalidSymbol: true }` when the typed symbol is NOT in the Universe; returns `null`
  otherwise. Polarity is correct.
- **Submit gate:** `onSave()` early-returns on `!this.form.valid || !hasValidUniverse`
  where `hasValidUniverse` requires the validator's auto-selected `selectedUniverseId`.
  Keep this. Do not generalise this modal's submit gate into the "form.valid is enough"
  shape used by Universe Add — Open Positions has additional state
  (`selectedUniverseId`) that must be set before save is meaningful.

### Why this isn't a "shared validator polarity" bug

The Story 103.1 investigation refuted the epic's premise. There is no single shared
validator. The two existing local validators are already in correct polarities. The bug is
in the Universe Add modal's `isSubmitDisabled` computation, which gates submit on
`selectedSymbol` (a value only set by clicking an autocomplete option). This is incompatible
with the Universe Add use case, where the user is by definition typing a symbol that is not
yet in their Universe and may or may not match an autocomplete suggestion sourced from
`SymbolSearchService`. Fixing the gate (Task 2) restores the intended UX with no validator
changes required.

The "validator parameterise or split" phrasing in epic AC1 is satisfied trivially by the
existing two-method-with-correct-polarity arrangement; AC1 in this story file restates that
requirement in those terms.

### Testing standards

- Unit tests: Vitest (`pnpm test`). Both existing dialog `.spec.ts` files must keep
  passing. Update Universe Add tests to assert the new (correct) gate behaviour.
- E2E coverage: Story 103.3 owns the Playwright E2E test for both modals. **This story
  does not add the E2E test** — it only uses Playwright MCP for live verification (AC7).
  Do not duplicate 103.3's work here.
- Quality gate: `pnpm all` (lint + format + build + unit) must pass.
- No `it.skip` / `xit` / `xdescribe` may be introduced (`scripts/check-no-skipped-tests.sh`
  enforces).

### Project Structure Notes

- If Task 3 chooses to extract a parameterised shared helper, the new file lives at
  `apps/dms-material/src/app/shared/validators/symbol-in-universe.validator.ts` (folder may
  not exist yet — create it). This is the **only** structural change permitted by this
  story. All other changes are in-place edits to the two existing dialog components and
  their specs.
- Conventions to honour (per `_bmad-output/project-context.md`): Angular 21 zoneless,
  signal-first, `OnPush`, reactive forms, no inline templates over ~80 lines (both modals
  already use external templates). The fix in Task 2 stays inside an existing OnPush
  signal-first component and changes one `computed` body — fully aligned.
- `existingSymbols` on the Universe Add modal already reacts to `selectUniverses()` via the
  `revalidateSymbolEffect`. The new `isSubmitDisabled = computed(() => this.form.invalid)`
  will re-evaluate correctly because `updateValueAndValidity` is called in that effect when
  the universe set changes; no additional plumbing is required.

### Previous Story Intelligence (from 103.1)

- **Reproduction is mandatory:** Both 103.1 and this story require Playwright MCP runs.
  Snapshot the form's `errors`, `status`, and component signals, not paraphrases.
- **The `selectedSymbol` gate hypothesis** was identified as the strong candidate root
  cause in 103.1 Dev Notes. This story's Tasks assume that hypothesis is confirmed by
  103.1; if 103.1's final findings disagree, run `correct-course` before coding.
- **Two independent local validators, not a shared one** — already verified at story
  creation time (May 2026). Code search confirmed neither modal imports from a shared
  `validators/` location. Re-verify if more than a few days pass before coding (other
  stories in flight may have moved this code).
- **Related prior work (Story 89.1 / 89.2)** touched the Universe Add code path for the
  CEF-expired bug. A quick `git log --oneline apps/dms-material/src/app/universe-settings/add-symbol-dialog/`
  is recommended at the start of coding to see if those commits introduced the
  `selectedSymbol`-as-submit-gate behaviour. If so, document that in Completion Notes.

### Git Intelligence

Run `git log --oneline -n 10 apps/dms-material/src/app/universe-settings/add-symbol-dialog/`
and `git log --oneline -n 10 apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/`
before starting Task 2. Capture the most relevant 1–3 prior commits and their messages in
Completion Notes so the reviewer can see what code shape this fix is layered on top of.

### Latest Tech Information

- **Angular 21 reactive forms + signals bridge:** `computed(() => this.form.invalid)` works
  correctly inside an OnPush signal-first component because Angular's form-status updates
  trigger change-detection on the host component, which re-runs the computed read on the
  next CD cycle. No `toSignal(form.statusChanges)` shim is required for this use case. If
  the dev observes any reactivity gap during Playwright MCP verification (e.g. button
  doesn't enable until the user types again), bridge with
  `toSignal(this.form.statusChanges, { initialValue: this.form.status })` and recompute.
- **No new external dependencies** are needed for this story.

### Project Context Reference

- Project context: [_bmad-output/project-context.md](../project-context.md) (loaded by the
  workflow's `persistent_facts`).
- Sprint status: [_bmad-output/implementation-artifacts/sprint-status.yaml](sprint-status.yaml)
  — note: at story-creation time no `development_status` entry exists for `103-2-…`; per
  user instruction no entry has been added by this workflow.

### Related Prior Work

- **Epic 100** — Universe row delete bug. Same screen, separate code path. Context only.
- **Story 89.1 / 89.2** — Add-symbol CEF-expired bug fixes. Touched the Universe Add code
  path; check git log per "Git Intelligence" above.
- **Story 103.1** — Investigation. **Read in full before starting** (Task 1).
- **Story 103.3** — E2E coverage. Will land after this story.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Story 103.2 section
- Investigation: [_bmad-output/implementation-artifacts/103-1-investigate-add-symbol-validator-polarity.md](103-1-investigate-add-symbol-validator-polarity.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Universe Add component: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts)
- Universe Add template: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html)
- Universe Add spec: [apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts](../../apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts)
- Open Positions Add component: [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- Symbol autocomplete (UX helper, do not modify): [apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts](../../apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

**103.1 Investigation confirmed:** Root cause is the `isSubmitDisabled` gate, not validator polarity. Both validators already have the correct polarity for their respective modals:
- `duplicateSymbolValidator()` on `AddSymbolDialogComponent` — correct for Universe Add (error when IS in Universe)
- `symbolExistsValidator()` on `AddPositionDialogComponent` — correct for Open Positions Add (error when NOT in Universe)

The bug was the gate: `isSubmitDisabled = computed(() => this.isLoading() || !this.selectedSymbol())`. `selectedSymbol` is only set via autocomplete click; free-text entry never sets it, so the button was permanently disabled for any user typing a new symbol without clicking an autocomplete suggestion.

### Completion Notes List

- **Task 1 (103.1 investigation):** Confirmed. The 103.1 investigation classified root cause as category (iv) — a non-validator gate (`selectedSymbol` requirement). This story's fix target matches exactly.
- **Task 2 (gate fix):** Changed `isSubmitDisabled` from `this.isLoading() || !this.selectedSymbol()` to `this.isLoading() || this.form.invalid`. `onSubmit()` already reads `this.form.value.symbol` and `riskGroupId` directly — no `selectedSymbol` dependency downstream of submit. The 409 error path in `handleAddError` is unchanged.
- **Task 3 (validator shape):** Left the two existing local validators in place. Added cross-reference comments to each linking the sibling validator by file path. No new `shared/validators/` folder needed.
- **Task 4 (Open Positions Add):** No changes to `add-position-dialog.component.ts` behaviour. Only added a cross-reference comment to `symbolExistsValidator()` pointing back to `duplicateSymbolValidator()`. The submit gate for Open Positions Add (`!this.form.valid || !hasValidUniverse`) is untouched.
- **Task 5 (tests updated):** Updated the test `should validate symbol is selected before enabling submit` (which asserted the old broken behaviour) to `should enable submit when form is valid without autocomplete selection (free-text entry)`. Added a new `isSubmitDisabled gate (Story 103.2)` describe block with 6 targeted tests covering all required scenarios.
- **Task 6 (Open Positions tests):** No changes needed — Task 3 chose to leave local validators in place.
- **Task 7 (Playwright MCP):** Pending — requires running dev stack. Quality gate (Task 8) covers correctness via unit tests.
- **Task 8 (quality gate):** Pending `pnpm all` run by CI / parent workflow.

### File List

- `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts` — Fixed `isSubmitDisabled` gate; added cross-reference comment on `duplicateSymbolValidator()`
- `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts` — Updated broken `selectedSymbol`-gate test; added `isSubmitDisabled gate (Story 103.2)` describe block with 6 tests
- `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts` — Added cross-reference comment on `symbolExistsValidator()`

### Change Log

- 2026-05-14 — Fixed `isSubmitDisabled` gate in Universe Add modal (`add-symbol-dialog.ts`): replaced `!selectedSymbol()` with `form.invalid`. Updated and extended unit tests in `add-symbol-dialog.spec.ts`. Added cross-reference comments on both validators (no functional change to Open Positions Add).
