const fs = require('fs');
const path = require('path');

// electron-builder's extraResources copy (copyDir) hardcodes an exclusion for any
// root-level `node_modules` directory, so the server runtime's node_modules staged by
// `pnpm install --prod` + prepare-server-runtime.js is silently dropped from resources.
// The server bundle resolves its dependencies at runtime via normal Node resolution, so
// without this hook the packaged app cannot load fastify/@fastify/static/prisma and all
// static files 404. This afterPack hook copies the staged node_modules into the unpacked
// resources dir after packing (before AppImage/deb are built), bypassing that filter.
module.exports = async function copyServerNodeModules(context) {
  const appOutDir = context.appOutDir;
  if (!appOutDir || !fs.existsSync(appOutDir)) {
    return;
  }

  // extraResources `to: apps/server` resolves to <resources>/apps/server.
  const resourcesPath = path.join(appOutDir, 'resources');
  const serverRuntimeRoot = path.resolve(
    __dirname,
    '../../../dist/apps/server',
  );
  const sourceNodeModules = path.join(serverRuntimeRoot, 'node_modules');
  const targetNodeModules = path.join(
    resourcesPath,
    'apps',
    'server',
    'node_modules',
  );

  if (!fs.existsSync(sourceNodeModules)) {
    console.warn(
      `[after-pack] server node_modules not found at ${sourceNodeModules}; skipping copy. ` +
        'Run the electron build:linux target (which stages it) before packaging.',
    );
    return;
  }

  fs.rmSync(targetNodeModules, { recursive: true, force: true });
  // Copy WITHOUT dereferencing so pnpm's symlink layout is preserved. pnpm
  // resolution depends on the top-level links pointing into
  // .pnpm/<pkg>/node_modules/ so Node's realpath-based upward search finds a
  // package's sibling deps; materializing them would break that. The catch:
  // cpSync rewrites every symlink target to an ABSOLUTE path under the staging
  // dir, so the packaged tree would only resolve while that dir exists on this
  // machine (never on CI or other machines). We fix that below by rewriting
  // each target to be relative.
  fs.cpSync(sourceNodeModules, targetNodeModules, { recursive: true });

  const relink = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (!entry.isSymbolicLink()) {
        if (entry.isDirectory()) {
          relink(full);
        }
        continue;
      }
      // Mirror this link's location in the staging tree and read its
      // ORIGINAL target there (cpSync already absolutized the copy).
      const srcLink = path.join(
        sourceNodeModules,
        path.relative(targetNodeModules, full),
      );
      let original;
      try {
        original = fs.readlinkSync(srcLink);
      } catch {
        continue; // link unreadable in staging; leave the copy as-is
      }
      const realDest = path.resolve(path.dirname(srcLink), original);
      if (realDest.startsWith(sourceNodeModules + path.sep)) {
        const destInTarget = path.join(
          targetNodeModules,
          realDest.slice(sourceNodeModules.length),
        );
        fs.rmSync(full);
        fs.symlinkSync(path.relative(path.dirname(full), destInTarget), full);
      } else if (path.isAbsolute(original)) {
        console.warn(
          `[after-pack] symlink ${full} -> ${original} points outside ` +
            'the staged node_modules; leaving as-is (may not resolve at runtime).',
        );
      }
    }
  };
  relink(targetNodeModules);

  console.log(
    `[after-pack] copied server node_modules into ${targetNodeModules} ` +
      '(symlink targets rewritten to relative paths)',
  );
};
