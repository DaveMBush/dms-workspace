# Story 102.1: Fix Electron Linux Installer — chrome-sandbox Permissions

Status: Approved

## Story

As Dave,
I want the Electron Linux installer to set `/opt/DMS/chrome-sandbox` to owner `root:root` and
mode `4755` automatically,
So that I can launch the installed Electron app without `--no-sandbox` and without seeing the
SUID-sandbox FATAL abort.

## Acceptance Criteria

1. **Given** the Electron app's packaging configuration
   (`apps/electron/electron-builder.yml`),
   **When** the developer adds an `afterInstall` hook for `.deb` (and an equivalent
   mechanism for any other Linux target the app currently produces — see the `linux.target`
   list in `electron-builder.yml`),
   **Then** the hook runs `chown root:root <chrome-sandbox path>` and
   `chmod 4755 <chrome-sandbox path>` as part of the install, so the file ends up
   owned by `root:root` with mode `-rwsr-xr-x` on disk.

2. **Given** a freshly built `.deb` produced by `pnpm nx run electron:package`
   (or whichever target invokes `electron-builder` — confirm during implementation),
   **When** Dave installs it on a clean Linux environment with
   `sudo dpkg -i <artefact>.deb`,
   **Then** `ls -l /opt/DMS/chrome-sandbox` shows owner `root:root` and mode
   `-rwsr-xr-x` (4755).

3. **Given** the installed app,
   **When** Dave launches it without any `--no-sandbox` flag,
   **Then** the app starts without the
   `The SUID sandbox helper binary was found, but is not configured correctly`
   FATAL message.

4. **Given** the Linux `target` list currently contains both `AppImage` and `deb`
   (see `apps/electron/electron-builder.yml` lines 34–38),
   **When** the developer applies the fix,
   **Then** the `.deb` is fixed via `afterInstall`, and the `AppImage` case is either
   (a) addressed equivalently (AppImages run a copy of `chrome-sandbox` that already
   ships with mode `4755` inside the squashfs — verify, document the verification in
   Dev Notes, and add the AppImage case if verification shows it is also broken), or
   (b) explicitly documented in Dev Notes as "AppImage is not the supported install
   path; only `.deb` is fixed by this story" so the scope decision is auditable.

5. **Given** the change is applied,
   **When** `pnpm all` runs,
   **Then** all tests pass and the Electron build target (`pnpm nx run electron:build`)
   and the package target (`pnpm nx run electron:package`, or equivalent) still
   produce artefacts successfully.

6. **Given** project conventions (NFR7),
   **When** Dave installs the package,
   **Then** he does NOT have to run any post-install `chmod`/`chown` commands
   manually for the app to launch.

## Tasks / Subtasks

- [ ] Task 1: Confirm current packaging surface and reproduce the bug (AC: 2, 3)

  - [ ] Read `apps/electron/electron-builder.yml` end-to-end (already shows
        `linux.target: [AppImage, deb]` — confirm nothing else has been added)
  - [ ] Build a current `.deb` with the existing packaging command
        (likely `pnpm nx run electron:package`; confirm exact target via
        `apps/electron/project.json`)
  - [ ] Install the `.deb` on a clean Linux environment
        (`sudo dpkg -i <artefact>.deb`) and run
        `ls -l /opt/DMS/chrome-sandbox` — record the observed owner/mode in Dev Notes
        (this is the "before" baseline)
  - [ ] Launch the app WITHOUT `--no-sandbox` and capture the exact FATAL message
        (or confirm absence). Record in Dev Notes.

- [ ] Task 2: Add the `afterInstall` hook for `.deb` (AC: 1, 2, 3, 6)

  - [ ] Create the script at `apps/electron/build-resources/linux/after-install.sh`
        (create the `linux/` subdirectory if it doesn't exist; the existing
        `directories.buildResources` is `apps/electron/build-resources` per Story 91.2's
        plan — verify this matches current `electron-builder.yml`, and if a different
        path is in use, prefer the existing one)
  - [ ] Script contents — minimum viable:
        ```sh
        #!/bin/sh
        set -e
        chown root:root /opt/DMS/chrome-sandbox
        chmod 4755 /opt/DMS/chrome-sandbox
        ```
        (Confirm the installed path is `/opt/DMS/chrome-sandbox` by inspecting the
        `.deb`'s file list with `dpkg -c`. The `productName: DMS` in
        `electron-builder.yml` makes `/opt/DMS/` the expected install root.)
  - [ ] Mark the script executable in the repo
        (`chmod +x apps/electron/build-resources/linux/after-install.sh`) and confirm
        `git update-index --chmod=+x` (or simply commit on a filesystem that preserves
        the bit) so it stays executable after clone
  - [ ] Wire it into `electron-builder.yml` under the `deb:` (or `linux:`) section.
        For `electron-builder` this is the
        [`fpm`-backed `afterInstall` field for the `deb` target](https://www.electron.build/configuration/linux#debianoptions)
        — set:
        ```yaml
        deb:
          afterInstall: build-resources/linux/after-install.sh
        ```
        Verify the path is resolved relative to the project's `directories.buildResources`
        (which is `../../dist/electron-dist`'s sibling — i.e. `apps/electron/`-relative
        in this repo because `electron-builder.yml` lives in `apps/electron/`). If
        `electron-builder` complains about path resolution at build time, fall back to
        the absolute-from-repo-root form documented in the electron-builder docs.

- [ ] Task 3: Decide and document AppImage handling (AC: 4)

  - [ ] After Task 2 produces a fixed `.deb`, also build the AppImage and inspect the
        permissions of `chrome-sandbox` *inside the AppImage's mounted FS* (run the
        AppImage with `--appimage-extract` and inspect the extracted tree). Record
        owner/mode in Dev Notes.
  - [ ] If the AppImage's `chrome-sandbox` is already `4755` and launches without the
        FATAL, document the verification in Dev Notes and treat AC4 as satisfied via
        option (a). NO code change required.
  - [ ] If the AppImage is also broken, add the equivalent fix per
        `electron-builder` AppImage docs (or document option (b) — explicitly out of
        scope, with rationale). Either choice satisfies AC4 as long as it is
        documented in Dev Notes.

- [ ] Task 4: Verify on a clean Linux install (AC: 2, 3, 6)

  - [ ] Take the new `.deb` to a clean Linux environment (Dave's normal install target;
        a fresh container or VM is acceptable)
  - [ ] `sudo dpkg -i <artefact>.deb`
  - [ ] `ls -l /opt/DMS/chrome-sandbox` — assert owner `root:root`, mode `-rwsr-xr-x`
  - [ ] Launch the installed app (e.g. via the desktop entry or
        `/opt/DMS/dms` — confirm executable name) WITHOUT `--no-sandbox`
  - [ ] Confirm no SUID-sandbox FATAL message; confirm the app window opens
        (do NOT also rely on the Story 102.2 `tslib` fix being landed — if it is
        not landed, the launch will still fail with the `tslib` error, which is OK
        and expected for THIS story; record the launch outcome accurately in
        Dev Notes either way)

- [ ] Task 5: Quality gates (AC: 5)

  - [ ] `pnpm nx run electron:build` exits 0
  - [ ] `pnpm nx run electron:package` (or whichever target produces the `.deb`) exits 0
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` clean
  - [ ] No regression in the existing Story 91.2 / 98.x packaging behaviour
        (extraResources still present, schema-engine still extracted, etc.)

## Dev Notes

### Architecture Compliance

- This story touches ONLY the Electron packaging configuration and a new install-time
  shell script. It does NOT modify `apps/electron/src/`, the Fastify server, the Angular
  frontend, the Prisma schema, or any of the data-flow code from Epics 95–98.
- The Linux SUID sandbox helper requirement is a Chromium/Electron platform constraint:
  `chrome-sandbox` MUST be owned `root:root` and mode `4755` (the suid bit is what makes
  the helper work). Documented at
  https://www.electronjs.org/docs/latest/tutorial/sandbox#linux-sandbox-helper.
- The accepted fix is the installer post-install hook (per the epic description and
  NFR7) — Dave should not have to run manual commands. We are NOT adding `--no-sandbox`
  as a workaround; that disables the sandbox and is not acceptable.

### Files to Touch

| Path                                                            | Change | Notes                                                                                |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `apps/electron/electron-builder.yml`                            | UPDATE | Add `deb.afterInstall` (and AppImage equivalent if Task 3 decides to)                |
| `apps/electron/build-resources/linux/after-install.sh`          | NEW    | Executable shell script that runs `chown root:root` and `chmod 4755` on chrome-sandbox |

Confirm `directories.buildResources` exists in `electron-builder.yml` (Story 91.2 set it
to `apps/electron/build-resources` in the planned config). If the live config does NOT
have `directories.buildResources`, either add it now or use a path that
`electron-builder` will resolve.

### Current State of `apps/electron/electron-builder.yml` (verified)

- `appId: com.davembush.dms`
- `productName: DMS` → install root is `/opt/DMS/`
- `linux.target: [AppImage, deb]`
- `linux.maintainer: 'DaveMBush <dave@davembush.com>'`
- No `deb:` block currently — add one
- `extraResources` already includes server, dms-material browser, prisma migrations,
  schema, and the Prisma schema-engine binary. DO NOT change these.

### Current State of `apps/electron/tsconfig.json` (verified — out of scope)

This story does NOT change `tsconfig.json`. Story 102.2 is the one that flips
`importHelpers: false`. Keep the changes in this story strictly to packaging.

### Why an `afterInstall` Script and Not a `chmod` in `extraResources`

`electron-builder`'s `extraResources` cannot set the suid bit; the install image is
unpacked under the user's privileges in some flows, and the suid bit only sticks when
applied as `root` AT install time. The `.deb`'s post-install maintainer script runs as
`root` via `dpkg`, which is exactly when we need to fix ownership and the suid bit.

### Out-of-Scope Reminders

- Do NOT add `tslib` or change `importHelpers` — that is Story 102.2.
- Do NOT add the smoke E2E test — that is Story 102.3.
- Do NOT introduce `--no-sandbox` as a fallback. It is not acceptable.
- Do NOT change the install root from `/opt/DMS/`. The `productName: DMS` in
  `electron-builder.yml` controls this; changing it would break every other path
  assumption in Stories 98.x.

### Testing Notes

There is no unit-test layer for `electron-builder.yml` or the install script. The
authoritative verification is:

1. The installer produces the file with the correct ownership/mode (Task 4).
2. The app launches without the SUID-sandbox FATAL (Task 4).
3. `pnpm all` continues to pass (Task 5).

A full automated smoke test for the packaged app is the responsibility of Story 102.3.
This story is allowed to verify by manual install on a clean Linux environment, with
the observations recorded in Dev Notes.

### Project Structure Notes

- Build resources live under `apps/electron/build-resources/` per the Story 91.2 plan.
  If the directory does not yet exist on disk, create it; do not relocate it elsewhere.
- Linux-specific resources should be grouped under `apps/electron/build-resources/linux/`
  for clarity (mirrors typical electron-builder layouts and keeps macOS / Windows
  resources cleanly separated for future stories).

### References

- Epic 102 source: [_bmad-output/planning-artifacts/epics-2026-05-08.md](../planning-artifacts/epics-2026-05-08.md) — Story 102.1 section
- Electron Linux sandbox helper docs: https://www.electronjs.org/docs/latest/tutorial/sandbox#linux-sandbox-helper
- electron-builder Debian options (afterInstall): https://www.electron.build/configuration/linux#debianoptions
- Related prior story (packaging baseline): [_bmad-output/implementation-artifacts/91-2-configure-electron-builder-cross-platform.md](91-2-configure-electron-builder-cross-platform.md)
- Related prior story (database/install conventions): [_bmad-output/implementation-artifacts/98-1-electron-first-install-database-creation.md](98-1-electron-first-install-database-creation.md)
- Related prior story (build pipeline): [_bmad-output/implementation-artifacts/83-3-fix-electron-build.md](83-3-fix-electron-build.md)
- Project context (conventions, `pnpm all`, NFRs): [_bmad-output/project-context.md](../project-context.md)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
