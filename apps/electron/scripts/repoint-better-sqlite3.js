#!/usr/bin/env node
/**
 * Re-point the staged server's better-sqlite3 symlinks from v12 to v13.
 *
 * Why: @prisma/adapter-better-sqlite3 declares `better-sqlite3@^12`, so the
 * isolated offline install (`pnpm install --prod --offline --ignore-workspace`)
 * stages a v12 copy for it. But that install SKIPS build scripts (pnpm 10+
 * "Ignored build scripts"), and better-sqlite3 v12 ships NO prebuilt binary —
 * its binding only appears after a postinstall download/build, which cannot run
 * offline. The result is the packaged-app crash:
 *   "Could not locate the bindings file" (better_sqlite3.node).
 *
 * better-sqlite3 v13, by contrast, ships self-contained N-API prebuilds in its
 * `prebuilds/` dir for every platform, so it loads with no build step. The
 * server already depends on v13 directly (so a v13 copy is always staged next
 * to the adapter's v12). pnpm 11 ignores `pnpm.overrides` in this isolated
 * install, so we re-point the adapter's symlink to the v13 copy instead.
 *
 * Runs AFTER `pnpm install` and BEFORE electron-builder packages node_modules,
 * so the AppImage ships the working v13 binding for the adapter.
 */

const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`[repoint-better-sqlite3] ${msg}`);
  process.exit(1);
}

const serverDir = path.resolve(__dirname, '../../../dist/apps/server');
const pnpmDir = path.join(serverDir, 'node_modules', '.pnpm');
if (!fs.existsSync(pnpmDir)) {
  fail(`staged .pnpm not found at ${pnpmDir}; run the isolated install first`);
}

// Pick a staged v13 copy that actually carries prebuilds.
const candidates = fs
  .readdirSync(pnpmDir)
  .filter((name) => /^better-sqlite3@13\./.test(name))
  .map((name) => path.join(pnpmDir, name, 'node_modules', 'better-sqlite3'))
  .filter(
    (dir) =>
      fs.existsSync(path.join(dir, 'prebuilds')) &&
      fs
        .readdirSync(path.join(dir, 'prebuilds'))
        .some((f) => f.endsWith('.node')),
  );
if (candidates.length === 0) {
  fail('no staged better-sqlite3@13 with prebuilds found; cannot re-point');
}
const target = candidates[0];

// Re-point every better-sqlite3 symlink in the .pnpm graph that currently
// resolves to a non-v13 (i.e. v12) copy, so all consumers use the prebuilt v13.
let repointed = 0;
for (const entry of fs.readdirSync(pnpmDir)) {
  const nm = path.join(pnpmDir, entry, 'node_modules', 'better-sqlite3');
  let stat;
  try {
    stat = fs.lstatSync(nm);
  } catch {
    continue; // not present for this package
  }
  if (!stat.isSymbolicLink()) continue;
  const resolved = path.resolve(
    pnpmDir,
    entry,
    'node_modules',
    fs.readlinkSync(nm),
  );
  if (/better-sqlite3@13\./.test(resolved)) continue; // already v13
  const relTarget = path.relative(path.dirname(nm), target);
  fs.rmSync(nm);
  fs.symlinkSync(relTarget, nm, 'dir');
  repointed += 1;
}

// Also fix the top-level staged better-sqlite3 if it points at v12.
const topLevel = path.join(serverDir, 'node_modules', 'better-sqlite3');
try {
  const st = fs.lstatSync(topLevel);
  if (st.isSymbolicLink()) {
    const resolved = path.resolve(
      path.dirname(topLevel),
      fs.readlinkSync(topLevel),
    );
    if (!/better-sqlite3@13\./.test(resolved)) {
      fs.rmSync(topLevel);
      fs.symlinkSync(
        path.relative(path.dirname(topLevel), target),
        topLevel,
        'dir',
      );
      repointed += 1;
    }
  }
} catch {
  /* top-level not a symlink (or absent) — nothing to do */
}

// Verify the adapter now resolves to a v13 copy that has prebuilds.
const adapterDir = path.join(
  serverDir,
  'node_modules',
  '@prisma',
  'adapter-better-sqlite3',
);
let resolvedFromAdapter;
try {
  resolvedFromAdapter = require.resolve('better-sqlite3/package.json', {
    paths: [adapterDir],
  });
} catch (err) {
  fail(
    `adapter still cannot resolve better-sqlite3 after re-point: ${err.message}`,
  );
}
const hasPrebuilds = fs.existsSync(
  path.join(path.dirname(resolvedFromAdapter), 'prebuilds'),
);
if (!hasPrebuilds) {
  fail(`adapter resolves to a copy without prebuilds: ${resolvedFromAdapter}`);
}

const targetVersion = path.basename(path.dirname(path.dirname(target))); // better-sqlite3@13.x.y
console.log(
  `[repoint-better-sqlite3] re-pointed ${repointed} symlink(s) -> ${targetVersion}`,
);
console.log(
  `[repoint-better-sqlite3] adapter now resolves better-sqlite3: ${resolvedFromAdapter}`,
);
