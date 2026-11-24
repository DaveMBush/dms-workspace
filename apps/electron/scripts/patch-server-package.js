const fs = require('fs');
const path = require('path');

// Prepares the staged server (dist/apps/server) for its isolated `pnpm install --prod --offline
// --ignore-workspace`. Two problems this solves:
//
// 1. Offline re-resolution drift — with no lockfile, pnpm resolves each transitive dep to the
//    newest version in cached metadata, which can be newer than what the root workspace actually
//    installed (e.g. @aws-sdk/core 3.981.x vs locked 3.978.x). Those tarballs are not in the local
//    store → ERR_PNPM_NO_OFFLINE_TARBALL. Seeding the staged dir with a copy of the root lockfile
//    pins every transitive dep to the exact versions that ARE in the store, while pnpm still
//    resolves the staged package.json's own direct deps fresh (so version bumps there keep working).
//
// 2. Stale "pnpm" field — older revisions of this script wrote overrides into package.json's
//    "pnpm" key. Since pnpm v10 that field is ignored (the install log warns about it), so remove
//    any leftover to keep the generated manifest clean.

const serverDir = path.resolve(__dirname, '../../../dist/apps/server');
const pkgPath = path.join(serverDir, 'package.json');
const rootLockfilePath = path.resolve(__dirname, '../../../pnpm-lock.yaml');
const stagedLockfilePath = path.join(serverDir, 'pnpm-lock.yaml');

if (!fs.existsSync(pkgPath)) {
  console.error(
    `[patch-server-package] missing generated package.json: ${pkgPath}`,
  );
  process.exit(1);
}

if (fs.existsSync(rootLockfilePath)) {
  fs.copyFileSync(rootLockfilePath, stagedLockfilePath);
  console.log(
    `[patch-server-package] seeded staged lockfile from root (${rootLockfilePath})`,
  );
} else {
  // Without the seed, offline install re-resolves to newest cached versions and may fail.
  if (fs.existsSync(stagedLockfilePath)) {
    fs.rmSync(stagedLockfilePath);
  }
  console.warn(
    `[patch-server-package] WARNING: no root pnpm-lock.yaml at ${rootLockfilePath}; staged install will re-resolve from scratch`,
  );
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.pnpm) {
  delete pkg.pnpm;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(
    `[patch-server-package] removed stale "pnpm" field from ${pkgPath}`,
  );
}
