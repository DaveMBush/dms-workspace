# CUSIP Cache Dark Mode Cosmetic Audit

**Date**: 2026-03-20
**Story**: 7.1
**Epic**: 7 — Dark Mode Cosmetic Fixes
**Method**: Static code inspection of `cusip-cache.html`, `cusip-cache.scss`, and `cusip-cache-add-dialog.html` against dark-theme CSS variable definitions

## Summary

The CUSIP Cache page uses Tailwind utility classes with hardcoded light-mode color values (e.g., `text-gray-600`, `bg-gray-50`) that do not adapt when `.dark-theme` is applied. While Tailwind's `darkMode` is configured as `['class', '.dark-theme']`, no `dark:` variants are used anywhere on this page. Below are all identified defects.

## Epic 5 Resolution Status

Epic 5 (Stories 5-1 through 5-4) completed a CSS audit and replaced hardcoded colors with theme variables in component SCSS files. However, the **Tailwind utility classes in the HTML template** were not addressed by Epic 5 — those are inline on the template and remain as light-mode-only values. The component SCSS file (`cusip-cache.scss`) is minimal and does not contain hardcoded colors (it was already clean).

**Conclusion**: Epic 5 did NOT resolve the dark-mode cosmetic issues in the CUSIP Cache HTML template.

## Defect List

### Defect 1: White-on-White Text in "Recently Added" Section

- **Severity**: Critical
- **Location**: `cusip-cache.html`, line ~72 — "Recently Added" heading
- **Element**: `<h3 class="mt-6 mb-2 text-sm font-medium text-gray-700">`
- **Issue**: `text-gray-700` (#374151) renders as dark text on what becomes a dark background in dark mode. With `--dms-surface` at `#1f2937`, the contrast is nearly invisible.
- **Also affected**: `<div class="text-xs p-2 bg-gray-50 rounded">` (line ~76) — `bg-gray-50` (#f9fafb) creates a bright white card on a dark surface, and the default dark text inside it is readable against the white background but the white card itself looks jarring.
- **Fix approach**: Replace `text-gray-700` with `dark:text-gray-300` variant or use `--dms-text-secondary`. Replace `bg-gray-50` with `dark:bg-gray-800` or use `--dms-surface` variable.
- **Resolved by E5**: No

### Defect 2: Statistics Labels Invisible in Dark Mode

- **Severity**: High
- **Location**: `cusip-cache.html`, lines ~50-62 — Statistics section
- **Elements**:
  - `<span class="text-xs text-gray-600">Total Entries</span>` (and similar for each stat)
  - `<span class="text-xs text-gray-600">Oldest Entry</span>`
  - `<span class="text-xs text-gray-600">Newest Entry</span>`
  - `<span class="text-xs text-gray-600">{{ sourceEntry.key }}</span>`
- **Issue**: `text-gray-600` (#4b5563) is very low contrast against dark backgrounds (#1f2937 surface). The text is nearly invisible.
- **Fix approach**: Add `dark:text-gray-400` variant to each instance.
- **Resolved by E5**: No

### Defect 3: Error Alert Styling Broken in Dark Mode

- **Severity**: Medium
- **Location**: `cusip-cache.html`, line ~29
- **Element**: `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mx-4 mt-4">`
- **Issue**: `bg-red-50` creates a nearly-white background; `text-red-700` may have reduced contrast. The entire error pattern is light-mode-only.
- **Fix approach**: Add dark variants: `dark:bg-red-900/20 dark:border-red-800 dark:text-red-400`.
- **Resolved by E5**: No

### Defect 4: "No Results" and "No Activity" Text Low Contrast

- **Severity**: Medium
- **Location**: `cusip-cache.html`, lines ~196, ~238
- **Elements**:
  - `<p class="text-gray-600 mt-4 text-center">No results found</p>`
  - `<p class="text-gray-600 mt-4 text-center">No recent activity</p>`
- **Issue**: Same `text-gray-600` contrast issue as Defect 2.
- **Fix approach**: Add `dark:text-gray-400` variant.
- **Resolved by E5**: No

### Defect 5: CUSIP Cache Add Dialog — No Dark Mode Issues Found

- **Severity**: None
- **Location**: `cusip-cache-add-dialog.html`
- **Issue**: The dialog uses Angular Material components (`mat-form-field`, `mat-select`, `mat-input`) and Tailwind layout utilities (`flex flex-col gap-4 mt-2`). Material components auto-theme via the Material dark theme. No hardcoded color classes are present.
- **Status**: No defects found

## Summary Table

| #   | Component              | Element | Tailwind Classes                        | Issue                        | Severity | Resolved by E5 | Needs Fix |
| --- | ---------------------- | ------- | --------------------------------------- | ---------------------------- | -------- | -------------- | --------- |
| 1   | Recently Added heading | `h3`    | `text-gray-700`                         | Low contrast on dark bg      | Critical | No             | Yes       |
| 2   | Recently Added items   | `div`   | `bg-gray-50`, default text              | Bright white card on dark bg | Critical | No             | Yes       |
| 3   | Stat labels            | `span`  | `text-gray-600`                         | Invisible on dark bg         | High     | No             | Yes       |
| 4   | Error alert            | `div`   | `bg-red-50 border-red-200 text-red-700` | Light-mode-only alert        | Medium   | No             | Yes       |
| 5   | No results text        | `p`     | `text-gray-600`                         | Low contrast on dark bg      | Medium   | No             | Yes       |
| 6   | No activity text       | `p`     | `text-gray-600`                         | Low contrast on dark bg      | Medium   | No             | Yes       |
| 7   | Add Dialog             | —       | —                                       | No issues                    | None     | N/A            | No        |

## Recommended Fix Strategy

All defects can be fixed by adding Tailwind `dark:` variants alongside existing classes, leveraging the existing `darkMode: ['class', '.dark-theme']` configuration. No SCSS changes or `::ng-deep` needed.
