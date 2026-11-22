const fs = require('fs');
const path = require('path');

// The staged server (dist/apps/server) is installed with `--ignore-workspace`, so it does NOT
// inherit the workspace root's pnpm.overrides. Without an override here, @prisma/adapter-
// better-sqlite3 re-resolves its transitive `better-sqlite3: ^12.6.0` to a 12.x copy — which has
// no N-API prebuilds and fails at runtime under Electron ("Could not locate the bindings file").
// This injects the same override into the generated package.json before that isolated install runs,
// so every better-sqlite3 (direct + transitive) dedupes to a single 13.x copy with prebuilds.

const BETTER_SQLITE3_OVERRIDE = '^13.0.3';

const serverDir = path.resolve(__dirname, '../../../dist/apps/server');
const pkgPath = path.join(serverDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error(
    `[patch-server-package] missing generated package.json: ${pkgPath}`,
  );
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.overrides = pkg.pnpm.overrides || {};
pkg.pnpm.overrides['better-sqlite3'] = BETTER_SQLITE3_OVERRIDE;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(
  `[patch-server-package] forced better-sqlite3 -> ${BETTER_SQLITE3_OVERRIDE} in ${pkgPath}`,
);

// The isolated install honors any existing staged lockfile. A stale one can still map the adapter's
// transitive dep to a 12.x copy, defeating the override (and --offline would then keep it). Remove it
// so pnpm re-resolves from cache with the override applied. It is a build artifact regenerated each run.
const lockPath = path.join(serverDir, 'pnpm-lock.yaml');
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath);
  console.log(
    `[patch-server-package] removed stale staged lockfile: ${lockPath}`,
  );
}
