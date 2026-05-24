# Deferred Work

Items deferred during code review or implementation, to be addressed in future stories.

---

## Deferred from: code review of 108-3-e2e-electron-package-launch-smoke pass 2 (2026-05-23)

### W4 — Pre-existing `check-no-skipped-tests.sh` failures not caused by Story 108.3

**Source:** `apps/dms-material-e2e/src/electron-smoke.spec.ts` (L93, L105), `volatility-visibility.spec.ts` (L28), `scrolling-regression-106-investigation.spec.ts` (L205), `scrolling-regression-101.spec.ts` (L689), `electron-package-launch-smoke.spec.ts` (L12)

**Detail:** Five pre-existing skip violations in `apps/dms-material-e2e/` cause `bash scripts/check-no-skipped-tests.sh` to exit 1. These were committed in Stories 98.4, 101, 106, and 82 prior to Story 108.3. Story 108.3's new Vitest spec is clean and does not appear in the violation list.

**Suggested fix:** Address each violation per its original story's E82/ATDD exemption pattern or remove the skips.

**Priority:** Medium — causes `pnpm all` to fail at the skip-gate step on any branch.

---

## Deferred from: code review of 108-3-e2e-electron-package-launch-smoke (2026-05-23)

### W1 — `parseSchemaModels` ignores `@@map` directives

**Source:** `apps/electron/src/electron-package-launch.smoke.spec.ts` — `parseSchemaModels()` function

**Detail:** The function matches `^model\s+(\w+)\s*{` to extract Prisma model names and uses them as SQLite table names. If a model has an `@@map("actual_table_name")` directive the regex returns the model name (e.g. `CamelCase`) instead of the mapped table name (`snake_case`). No current schema models use `@@map`, so there are no false failures today. If `@@map` is added in a future migration this assertion would silently use the wrong table name and pass falsely.

**Suggested fix:** Parse `@@map("...")` inside each model block and substitute the mapped name when present.

**Priority:** Low — pre-existing limitation, no current schema entries affected.

---

### W2 — No `--appimage-extract-and-run` flag for FUSE-less Linux environments

**Source:** Both `apps/electron/src/electron-package-launch.smoke.spec.ts` and `apps/dms-material-e2e/src/electron-package-launch-smoke.spec.ts`

**Detail:** AppImages require FUSE to mount. On containerized Linux CI runners without FUSE support (e.g. GitHub-hosted Ubuntu runners prior to enabling user namespaces), the AppImage launch silently fails. The existing `smoke-test.sh` has the same gap. Workaround: pass `--appimage-extract-and-run` env/flag to bypass FUSE and extract+run inline.

**Suggested fix:** Detect FUSE availability via `ls /dev/fuse` or `fuse-overlayfs --version` and conditionally prepend `APPIMAGE_EXTRACT_AND_RUN=1` to the env when FUSE is absent.

**Priority:** Medium — will block all AppImage tests on FUSE-less CI.

---

### W3 — Vitest `beforeAll` hard-throws when AppImage not pre-built

**Source:** `apps/electron/src/electron-package-launch.smoke.spec.ts` — `beforeAll(locateAppImage)` block

**Detail:** Per story Task 3 the spec intentionally throws `Error` (does not skip) when `dist/electron-dist/*.AppImage` is absent. This means `pnpm all` fails on any branch where `nx run electron:build:linux` has not been run first. CI must be configured to build the AppImage before running `pnpm all`. This is not documented in the CI pipeline configuration.

**Suggested fix:** Create a CI pipeline documentation story or GitHub Actions workflow that builds the Electron package before running `pnpm all` when the `apps/electron/**` path is affected.

**Priority:** Medium — will cause all developers to see confusing test failures if they run `pnpm all` without a pre-built AppImage.
