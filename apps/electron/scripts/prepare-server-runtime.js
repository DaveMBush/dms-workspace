const fs = require('fs');
const path = require('path');

// Prepares the staged server runtime (dist/apps/server) for packaging.
//
// Only the Prisma generated client needs copying: `pnpm install --prod` does not run
// `prisma generate`, so the workspace-generated .prisma/client must be copied into the
// staged node_modules or the packaged app cannot load @prisma/client at startup.
//
// better-sqlite3 v13 ships N-API prebuilds inside its npm package (prebuilds/<platform>-<arch>.node),
// which load under Electron's ABI without any rebuild. The prod install places them in both the
// top-level and .pnpm copies, and scripts/after-pack.js ships that node_modules into resources —
// so no binding copy is needed here anymore (the old build/Release/better_sqlite3.node fan-out was
// only required for v12's ABI-specific compiled binding).

const workspaceRoot = path.resolve(__dirname, '../../..');
const serverRuntimeRoot = path.join(workspaceRoot, 'dist/apps/server');
const clientEntry = require.resolve('@prisma/client');
const generatedClient = path.resolve(
  path.dirname(clientEntry),
  '..',
  '..',
  '.prisma',
  'client',
);
const targetClient = path.join(
  serverRuntimeRoot,
  'node_modules/.prisma/client',
);

fs.rmSync(targetClient, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetClient), { recursive: true });
fs.cpSync(generatedClient, targetClient, { recursive: true });
