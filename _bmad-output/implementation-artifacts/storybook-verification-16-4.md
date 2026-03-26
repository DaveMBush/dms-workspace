# Storybook Story Verification — Epic 16

Date: 2026-03-26

## Scope

Verified Storybook stories against the live Storybook dev server at `http://localhost:6006` using Playwright browser automation.

Acceptance criteria covered:

- Every story variant rendered in the canvas without a blank page or Storybook error screen.
- No browser console errors were reported for any verified Storybook story.
- No `Cannot destructure property 'id' of 'defaultExport' as it is undefined` error appeared.
- Multi-variant stories were checked variant-by-variant.

## Results

| Story                         | Variants Checked                       | Status  | Notes                                                                      |
| ----------------------------- | -------------------------------------- | ------- | -------------------------------------------------------------------------- |
| Introduction                  | Welcome                                | ✅ Pass | Welcome copy rendered in the Storybook canvas.                             |
| Components/Dashboard          | Default                                | ✅ Pass | Placeholder dashboard content rendered.                                    |
| Components/NodeEditor         | Default, CustomPlaceholder             | ✅ Pass | Input rendered; placeholder text changed per variant.                      |
| Components/BaseTable          | Default, Empty, Loading, Selectable    | ✅ Pass | Distinct table states rendered, including loading bar and selectable mode. |
| Components/EditableCell       | Default, Currency, Decimal, WithMinMax | ✅ Pass | Distinct numeric formatting and value states rendered.                     |
| Components/EditableDateCell   | Default, Empty, FutureDate             | ✅ Pass | Default and future dates rendered; empty state rendered without errors.    |
| Components/Splitter           | Default, EvenSplit, NarrowLeft         | ✅ Pass | Splitter rendered with distinct initial left-panel widths across variants. |
| Components/SymbolAutocomplete | Default, CustomLabel                   | ✅ Pass | Field rendered with distinct labels across variants.                       |

## Runtime Verification Notes

- Verified directly against the live Storybook dev server, not just a static build.
- Checked the Storybook iframe route for each variant and confirmed mounted DOM content in `#storybook-root`.
- Browser console error level remained clean for all verified story variants.
- Historical Storybook runtime failures were not reproduced after the final fix set:
  - `experimentalZoneless` forced to `false` in `apps/dms-material/project.json`
  - preview-level custom global render removed from `apps/dms-material/.storybook/preview.ts`

## Validation Commands

| Command                          | Status  | Notes                                                                                                                                  |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm all`                       | ✅ Pass | `nx affected -t lint build test --parallel=16` completed successfully.                                                                 |
| `pnpm e2e:dms-material:chromium` | ✅ Pass | 583 passed, 130 skipped.                                                                                                               |
| `pnpm e2e:dms-material:firefox`  | ✅ Pass | 583 passed, 130 skipped.                                                                                                               |
| `pnpm dupcheck`                  | ✅ Pass | 0 clones found.                                                                                                                        |
| `pnpm format`                    | ✅ Pass | Formatting applied to `apps/dms-material/project.json` and `apps/dms-material/src/app/shared/components/splitter/splitter.stories.ts`. |

## Follow-up Notes

- A worktree-local `pnpm exec prisma generate` was required before the e2e server could start because the Prisma client was missing in this checkout.
- A Firefox-only flaky validation test in `apps/dms-material-e2e/src/loading-spinner-centering.spec.ts` was stabilized by mocking delayed account summary responses instead of depending on backend seed data.
