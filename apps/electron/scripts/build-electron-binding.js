#!/usr/bin/env node
/**
 * Rebuilds better-sqlite3 for the PACKAGED Electron ABI so the app can load it.
 *
 * The server runtime is launched via ELECTRON_RUN_AS_NODE, which uses Electron's
 * V8/Node ABI (e.g. 145 for Electron 41.x). The workspace-root binding is built
 * for system Node (e.g. 137) and cannot be loaded under Electron.
 *
 * CRITICAL: the target must be the electronVersion that electron-builder actually
 * ships (electron-builder.yml), NOT the installed dev `electron` dependency — they
 * can differ (dev 43.x/ABI148 vs packaged 41.x/ABI145). Building for the wrong one
 * reproduces "was compiled against a different Node.js version" at runtime.
 *
 * prepare-server-runtime.js ships the binding from the WORKSPACE-ROOT top-level
 * better-sqlite3, so we rebuild IN PLACE there, then fan the resulting .node out to
 * every pnpm virtual-store copy that the server bundle resolves at runtime.
 *
 * Steps:
 *   1. Resolve the root better-sqlite3 package dir + the packaged Electron version.
 *   2. node-gyp rebuild in that dir with --runtime=electron --target=<packaged>.
 *   3. Copy build/Release/better_sqlite3.node into every .pnpm virtual-store copy
 *      (node_modules/.pnpm and dist/apps/server/node_modules/.pnpm) + the dist top-level.
 *   4. Verify: if a packaged Electron binary is present, load-test the binding under it
 *      (authoritative). Otherwise report the target ABI for a post-build runtime check.
 *
 * NOTE: this leaves the workspace-root binding at the packaged Electron ABI, so plain-Node
 * dev mode (server under Node 24) needs a `pnpm rebuild better-sqlite3` afterwards.
 *
 * Compiler note: on Linux, very new GCC (>= 15) can fail to parse Electron's V8 headers.
 * We try the system default first, then fall back to g++-13 / g++-12.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../../..');

// --- Resolve the root better-sqlite3 package (the source prepare-server-runtime ships) ---
let sqlitePkgDir;
try {
  const resolved = require.resolve('better-sqlite3/package.json', { paths: [workspaceRoot] });
  sqlitePkgDir = path.dirname(resolved);
} catch {
  console.error('[build-electron-binding] Cannot resolve better-sqlite3 from workspace root. Run `pnpm install` first.');
  process.exit(1);
}

// --- Resolve the PACKAGED Electron version (what electron-builder ships) ---
const builderYml = path.join(workspaceRoot, 'apps/electron/electron-builder.yml');
let electronVersion;
try {
  const m = fs.readFileSync(builderYml, 'utf8').match(/electronVersion:\s*['"]?([\d.]+)/);
  if (m) electronVersion = m[1];
} catch {}
if (!electronVersion) {
  try {
    const electronPkg = require.resolve('electron/package.json', { paths: [workspaceRoot] });
    electronVersion = JSON.parse(fs.readFileSync(electronPkg, 'utf8')).version;
    console.warn(`[build-electron-binding] No electronVersion in ${builderYml}; falling back to dev electron ${electronVersion}.`);
  } catch {
    console.error('[build-electron-binding] Cannot resolve Electron version (no electron-builder.yml electronVersion and no `electron` package).');
    process.exit(1);
  }
}

const bindingPath = path.join(sqlitePkgDir, 'build/Release/better_sqlite3.node');

console.log(`[build-electron-binding] better-sqlite3: ${sqlitePkgDir}`);
console.log(`[build-electron-binding] Targeting PACKAGED Electron v${electronVersion} (the ABI the AppImage runs)`);

// --- Build with node-gyp against the packaged Electron ABI, in place at the root package ---
const gyp = path.join(sqlitePkgDir, 'node_modules', '.bin', 'node-gyp');
const gypCmd = fs.existsSync(gyp) ? `"${gyp}"` : 'npx --no-install node-gyp';

function buildWithCompiler(cxx) {
  const env = { ...process.env };
  if (cxx) env.CXX = cxx;
  execSync(
    `${gypCmd} rebuild --runtime=electron --target=${electronVersion} --dist-url=https://www.electronjs.org/headers`,
    { cwd: sqlitePkgDir, stdio: 'inherit', env },
  );
}

try {
  buildWithCompiler(null);
} catch (err) {
  console.error('[build-electron-binding] Default compiler failed. Retrying with g++-13 / g++-12...');
  const fallbacks = ['g++-13', 'g++-12'];
  let built = false;
  for (const cxx of fallbacks) {
    try {
      execSync(`${cxx} --version`, { stdio: 'ignore' });
    } catch {
      continue; // compiler not installed
    }
    try {
      buildWithCompiler(cxx);
      built = true;
      break;
    } catch {}
  }
  if (!built) throw err;
}

if (!fs.existsSync(bindingPath)) {
  console.error(`[build-electron-binding] Build did not produce ${bindingPath}`);
  process.exit(1);
}
console.log(`[build-electron-binding] Built: ${bindingPath}`);

// --- Fan out to every pnpm virtual-store copy + the dist top-level ---
const targets = new Set();
for (const nm of [path.join(workspaceRoot, 'node_modules'), path.join(workspaceRoot, 'dist/apps/server/node_modules')]) {
  const pnpmDir = path.join(nm, '.pnpm');
  if (!fs.existsSync(pnpmDir)) continue;
  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!/^better-sqlite3@/.test(entry)) continue;
    targets.add(path.join(pnpmDir, entry, 'node_modules', 'better-sqlite3', 'build/Release'));
  }
}
targets.add(path.join(workspaceRoot, 'dist/apps/server/node_modules/better-sqlite3/build/Release'));

let copied = 0;
for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;
  fs.copyFileSync(bindingPath, path.join(dir, 'better_sqlite3.node'));
  copied += 1;
}
console.log(`[build-electron-binding] Copied binding into ${copied} location(s).`);

// --- Verify against the actual packaged Electron binary when one is present ---
// On a fresh build this runs before electron-builder creates linux-unpacked, so there may be
// no 41.x binary yet; in that case we rely on node-gyp --target=<packaged> producing the right
// ABI by construction and defer the load test to launching the app.
const unpackedDir = path.join(workspaceRoot, 'dist/electron-dist/linux-unpacked');

function findPackagedElectron() {
  if (!fs.existsSync(unpackedDir)) return null;
  const candidates = fs.readdirSync(unpackedDir).filter((f) => {
    const p = path.join(unpackedDir, f);
    try {
      return fs.statSync(p).isFile() && fs.accessSync(p, fs.constants.X_OK);
    } catch {
      return false;
    }
  });
  // Prefer the main app binary (productName), then any executable that runs as node.
  for (const name of ['DMS', 'electron', ...candidates]) {
    const bin = path.join(unpackedDir, name);
    if (!fs.existsSync(bin)) continue;
    try {
      execSync(`"${bin}" -e "process.exit(0)"`, { stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
      return bin;
    } catch {}
  }
  return null;
}

const checkFile = path.join(os.tmpdir(), `bsqlite-abi-check-${process.pid}.cjs`);
fs.writeFileSync(
  checkFile,
  [
    `const Database = require(${JSON.stringify(sqlitePkgDir)});`,
    "const db = new Database(':memory:');",
    "db.exec('CREATE TABLE t(x)');",
    "console.log('[build-electron-binding] better-sqlite3 loaded at ABI ' + process.versions.modules + '.');",
  ].join('\n'),
);

const packagedBin = findPackagedElectron();
if (packagedBin) {
  try {
    execSync(`"${packagedBin}" "${checkFile}"`, { stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
    console.log('[build-electron-binding] Verified against the packaged Electron binary.');
  } catch (err) {
    console.error(`[build-electron-binding] FAILED to load under the packaged Electron (${packagedBin}). ABI mismatch — check electronVersion in electron-builder.yml.`);
    process.exit(1);
  }
} else {
  console.log('[build-electron-binding] No packaged Electron binary present yet (fresh build).');
  console.log(`[build-electron-binding] Binding built for Electron v${electronVersion} by construction. Launch the AppImage to confirm it loads at runtime.`);
}

fs.rmSync(checkFile, { force: true });
console.log('[build-electron-binding] Done.');
