# Story 102.3: E2E Smoke Test — Packaged Electron App Launches Cleanly

Status: Approved

<!-- Source: _bmad-output/planning-artifacts/epics-2026-05-08.md, Epic 102, Story 102.3 -->

## Story

As a developer,
I want an automated smoke test that installs the packaged Electron app on a clean fixture,
launches it without `--no-sandbox`, and asserts the main window renders without the sandbox
FATAL or the `tslib` error,
So that future regressions to either fix (Story 102.1 chrome-sandbox perms; Story 102.2 tslib
inlining) are caught before release.

## Acceptance Criteria

1. **Given** the Electron build artifact produced by the existing build target,
   **When** the smoke test installs it into a clean fixture directory,
   **Then** the install completes and `chrome-sandbox` ends up with owner `root:root` and mode
   `4755` (asserted via `stat` or equivalent).

2. **Given** the installed app,
   **When** the smoke test launches it without `--no-sandbox`,
   **Then** the test asserts the process does NOT exit with the sandbox-helper FATAL message
   and does NOT log `Cannot find module 'tslib'`.

3. **Given** the launched app,
   **When** the smoke test waits for the main window,
   **Then** it asserts the Angular app's home route renders without console errors (matching
   the Story 77.5 pattern).

4. **Given** the smoke test is committed,
   **When** `pnpm all` runs,
   **Then** the test runs (it is not skipped) and passes — or, if running the test in CI
   requires elevated privileges, the test is gated behind an explicit
   `pnpm e2e:electron:smoke` target and documented as a release-gate test in the architecture
   document.

## Tasks / Subtasks

- [ ] Decide test placement and gating strategy (AC: #4)
  - [ ] Inspect `apps/dms-material-e2e/playwright.config.ts` and existing `electron` project
        used by Story 77.5 (`electron-launch.spec.ts`) to confirm naming conventions
  - [ ] Decide whether the new spec joins the existing `electron` project or lives in a new
        `electron-smoke` project (recommend new project: it requires a packaged installer,
        not just a built `main.js`)
  - [ ] If `pnpm all` cannot reasonably install a packaged `.deb` in the developer/CI
        environment, gate behind a new Nx target `e2e:electron:smoke` and document in
        `docs/architecture.md` (or `_bmad-output/planning-artifacts/architecture.md`) as a
        required release-gate check; otherwise wire into the default `pnpm all` flow
  - [ ] Update `apps/dms-material-e2e/project.json` with the chosen target

- [ ] Build a clean-fixture install helper (AC: #1)
  - [ ] In a new spec (e.g., `apps/dms-material-e2e/src/electron-smoke.spec.ts`) add a helper
        that: locates the latest `.deb` under `dist/electron-dist/` (per
        `apps/electron/electron-builder.yml` `directories.output`), installs it into an
        isolated fixture, and records the install root path
  - [ ] Prefer `dpkg -x <deb> <fixture>` for an unprivileged extract when only verifying file
        layout; use `sudo dpkg -i` (or `pkexec`) only when the test must validate the real
        post-install hook from Story 102.1 — which it must, per AC #1
  - [ ] Capture `stdout`/`stderr` of the install and fail fast on non-zero exit
  - [ ] If `sudo` is required, gate with a clear precondition skip + actionable error message

- [ ] Assert chrome-sandbox ownership and mode (AC: #1)
  - [ ] After install, `stat -c '%U:%G %a' /opt/DMS/chrome-sandbox` (or installed equivalent
        path resolved from the fixture) and assert `root:root` and `4755`
  - [ ] On failure, surface the actual values and the install log to make Story 102.1
        regressions obvious

- [ ] Launch the installed binary without `--no-sandbox` and capture diagnostics (AC: #2, #3)
  - [ ] Spawn the installed app binary directly (NOT via `playwright._electron.launch` against
        `dist/apps/electron/main.js` — that bypasses packaging). Use `child_process.spawn` to
        execute the installed binary at its real path (e.g., `/opt/DMS/dms`), then attach
        Playwright via Chrome DevTools Protocol if needed for window assertions
  - [ ] Pass NO `--no-sandbox` argument
  - [ ] Tee stdout+stderr; assert the captured text does NOT contain
        `The SUID sandbox helper binary was found, but is not configured correctly`
  - [ ] Assert the captured text does NOT contain `Cannot find module 'tslib'`
  - [ ] Assert the process did not exit with a non-zero code within the launch window
  - [ ] If using Playwright `_electron.launch` against the installed binary path is feasible
        (Playwright accepts an `executablePath` for ElectronApplication on some channels),
        prefer that for window/console assertions; otherwise fall back to CDP attach

- [ ] Assert the main window renders cleanly (AC: #3)
  - [ ] Wait for the first BrowserWindow and `domcontentloaded`, mirroring the Story 77.5
        pattern in `apps/dms-material-e2e/src/electron-launch.spec.ts`
  - [ ] Register `window.on('console', ...)` to collect console errors and assert empty
  - [ ] Assert a known home-route element is visible (reuse the selector pattern from
        `electron-launch.spec.ts`)

- [ ] Cleanup (AC: #1, #2)
  - [ ] In `afterAll`: close the app, then `dpkg -r dms` (or extract-only cleanup `rm -rf
        <fixture>`) to leave the host clean
  - [ ] Ensure cleanup runs even when the test fails

- [ ] Wire into the build pipeline (AC: #4)
  - [ ] Add `dependsOn` so the smoke target requires `electron:package` (or whatever target
        produces the `.deb` per `electron-builder.yml`) — not just `electron:build`
  - [ ] Update `pnpm all` script in root `package.json` to include the smoke target IF not
        gated; otherwise add a docs note pointing to the gated `pnpm e2e:electron:smoke`
  - [ ] Run the chosen path locally and confirm the test runs and passes

- [ ] Documentation (AC: #4)
  - [ ] If gated: add a "Release Gate Tests" subsection to the architecture document
        listing `e2e:electron:smoke` as required before tagging an Electron release
  - [ ] Cross-link Stories 102.1 and 102.2 so future regressions to either are routed back to
        this test

## Dev Notes

### Why a new spec, not an extension of Story 77.5's spec

`apps/dms-material-e2e/src/electron-launch.spec.ts` (Story 77.5) launches Electron from the
**built `main.js`** under `dist/apps/electron/`. That is fine for unit-of-integration
coverage, but it does NOT exercise:

- The Linux installer's `afterInstall` hook (Story 102.1 — chrome-sandbox perms)
- The packaged tsconfig output (Story 102.2 — `tslib` resolution from the asar/resources)
- The real installed binary path used by users

This story's smoke test MUST exercise the packaged artifact end-to-end. Treat it as a
release gate, not a per-PR test, unless the install step can be made hermetic and
unprivileged in CI.

### Files to read before implementing

CRITICAL — read these completely before writing code; they encode the existing patterns this
test must mirror:

- `apps/dms-material-e2e/src/electron-launch.spec.ts` — Story 77.5 launch pattern
  (Playwright `_electron`, `firstWindow()`, `console` event collection, `app.close()`)
- `apps/dms-material-e2e/playwright.config.ts` — existing `electron` project shape; new
  project must follow the same convention
- `apps/dms-material-e2e/project.json` — Nx target definitions; the new `e2e:electron:smoke`
  target goes here
- `apps/electron/electron-builder.yml` — output dir is `../../dist/electron-dist`, Linux
  targets are `AppImage` and `deb`. The smoke test should consume the `.deb`
- `apps/electron/tsconfig.json` — Story 102.2 changes `importHelpers` here. The smoke test
  validates the *result* (no `tslib` log) but does not edit this file
- `apps/electron/src/main.ts` — to confirm where launch errors print and whether
  `ELECTRON_TEST_MODE` (used in Story 77.5) is honored by the packaged build
- Root `package.json` — `pnpm all` script composition; needed to wire (or document) the new
  target

### Cross-story dependency

This story validates Stories 102.1 and 102.2. It is the last of Epic 102 and should be
merged AFTER 102.1 and 102.2 land — otherwise it will fail by design. If 102.1 or 102.2 is
not yet merged when this story is implemented, mark the assertions clearly so the failure
mode points the developer at the correct upstream story.

### Sandbox + install-as-root caveat

The `afterInstall` hook in Story 102.1 sets `chrome-sandbox` to `root:root` mode `4755`.
That requires a real `dpkg -i` (root). In a developer or CI environment without root, the
test cannot validate AC #1 with `dpkg -x` extraction alone (extraction preserves perms in
the archive but does NOT execute maintainer scripts, so the mode bits set by the hook will
not be applied).

Two acceptable approaches:

1. **Real install (preferred for release gate):** require sudo, run `sudo dpkg -i <deb>`,
   then assert. Document the sudo requirement and gate the target behind
   `pnpm e2e:electron:smoke`.
2. **Hybrid (for CI without sudo):** assert the maintainer script body itself contains the
   `chown root:root` and `chmod 4755` commands targeting the correct path
   (`dpkg -e <deb> <ctl>; grep` the `postinst` script). This is a weaker assertion but is
   hermetic. Use this only as a fallback and only when the release-gate (real install) is
   also documented.

Pick one. Document the choice in the test file's top-of-file comment AND in the architecture
release-gate note.

### Testing standards

- Playwright is the project's E2E framework. Use `import { _electron as electron } from
  'playwright'` per Story 77.5 precedent
- No `test.skip` — AC #4 requires the test runs (the gating mechanism is an explicit Nx
  target, not skip)
- Console-error assertion uses the same `window.on('console', ...)` collector pattern as
  Story 77.5
- Test must clean up after itself in `afterAll`, regardless of pass/fail

### Project Structure Notes

- New spec: `apps/dms-material-e2e/src/electron-smoke.spec.ts` (matches existing
  `electron-*.spec.ts` glob convention from Story 77.5)
- New Nx target: `e2e:electron:smoke` in `apps/dms-material-e2e/project.json`
- No changes to `apps/electron/` source — this story is test-only
- Architecture doc edit (release-gate section) only if gating path is chosen

### References

- Source story: `_bmad-output/planning-artifacts/epics-2026-05-08.md` (Epic 102, Story 102.3)
- Pattern reference: `_bmad-output/implementation-artifacts/77-5-e2e-electron-launch.md`
- Sibling stories in epic: Story 102.1 (chrome-sandbox perms), Story 102.2 (tslib inlining)
- Packaging config: `apps/electron/electron-builder.yml`
- Electron tsconfig (read-only for this story): `apps/electron/tsconfig.json`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
