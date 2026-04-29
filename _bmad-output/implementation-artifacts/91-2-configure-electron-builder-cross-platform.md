# Story 91.2: Configure electron-builder and Produce Cross-Platform Packages

Status: Approved

## Story

As Dave,
I want an `electron-builder` configuration that produces installable packages for Linux,
macOS, and Windows when `pnpm nx run electron:package` is executed,
So that the app can be distributed without requiring Node.js or any development toolchain on
the target machine.

## Acceptance Criteria

1. **Given** `pnpm nx run electron:package` is executed on a Linux build machine,
   **When** the build completes,
   **Then** an AppImage and/or `.deb` artefact is produced in `dist/electron/` (or a
   configured output directory).

2. **Given** the electron-builder configuration,
   **When** it is inspected,
   **Then** the asar bundle includes `dist/apps/server/` and
   `dist/apps/dms-material/browser/`; the SQLite database file and Prisma migration
   artefacts are excluded from the asar.

3. **Given** the Nx workspace `project.json` for the `electron` project,
   **When** the `package` target is run,
   **Then** it depends on `electron:build`, `server:build:production`, and
   `dms-material:build:production` so all artefacts are fresh before packaging.

4. **Given** `pnpm all` runs after this story,
   **Then** all existing tests pass (`electron:build` and unit test targets must remain
   green; the new `electron:package` target is additive only).

## Tasks / Subtasks

- [ ] Task 1: Install electron-builder as a dev dependency
  - [ ] `pnpm add -D electron-builder -w` (workspace root) or
        `pnpm add -D electron-builder` inside `apps/electron/`
  - [ ] Confirm no peer-dependency conflicts

- [ ] Task 2: Create `electron-builder.yml` (or add config to `apps/electron/package.json`)
  - [ ] Set `appId`, `productName`, `directories.output`
  - [ ] Configure `files` to include all compiled dist artefacts
  - [ ] Configure `asarUnpack` or `extraResources` to place Prisma migration files and
        schema outside the asar
  - [ ] Add Linux target: `AppImage` and `deb`
  - [ ] Add macOS target: `dmg`
  - [ ] Add Windows target: `nsis`

- [ ] Task 3: Add `package` Nx target to `apps/electron/project.json`
  - [ ] Target command: `electron-builder --config apps/electron/electron-builder.yml`
        (or similar, adjusted for Nx)
  - [ ] Add `dependsOn`: `["electron:build", "^server:build:production",
        "^dms-material:build:production"]` (verify exact target names in the workspace)

- [ ] Task 4: Verify local Linux package build
  - [ ] Run `pnpm nx run electron:package` locally
  - [ ] Confirm AppImage artefact is produced in the output directory
  - [ ] Check the asar contents to confirm server and Angular bundles are included

- [ ] Task 5: Run `pnpm all` — confirm all pre-existing tests pass

## Dev Notes

### electron-builder Config Reference

Minimal `electron-builder.yml` structure:

```yaml
appId: com.davembush.dms
productName: DMS
directories:
  output: dist/electron-dist
  buildResources: apps/electron/build-resources
files:
  - "dist/apps/electron/**/*"
  - "dist/apps/server/**/*"
  - "dist/apps/dms-material/browser/**/*"
  - "apps/electron/package.json"
extraResources:
  - from: "prisma/migrations"
    to: "migrations"
  - from: "prisma/schema.prisma"
    to: "schema.prisma"
linux:
  target:
    - AppImage
    - deb
mac:
  target: dmg
win:
  target: nsis
```

Adjust paths based on the plan from Story 91.1.

### Note on `asar`

The SQLite `.db` file must NOT be inside the asar — it lives in `app.getPath('userData')`
and is created at first launch. The Prisma migration files must also be outside the asar
(placed in `extraResources`) so they are accessible via `process.resourcesPath` at runtime.

### Cross-Platform CI

Building macOS packages typically requires a macOS runner; building Windows NSIS installers
typically requires a Windows runner or `wine`. For this story, verifying the Linux AppImage
locally is sufficient. CI matrix configuration is out of scope.
