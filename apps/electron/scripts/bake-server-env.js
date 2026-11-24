const fs = require('fs');
const path = require('path');

// Bakes a focused set of server runtime config values into the staged server dir so the
// packaged app (which launches from a bare desktop shell with no env) can authenticate.
//
// The server builds its Cognito config at module-load time purely from process.env
// (see apps/server/src/app/config/create-fallback-config.function.ts). In dev those vars
// come from the developer's shell / .env.local; in the packaged app nothing loads that
// file, so every authenticated request throws "Missing required Cognito configuration".
//
// This reads the workspace .env.local (the local-deployment config) and writes an allowlisted
// subset to dist/apps/server/server-runtime.env.json. That dir is already shipped into
// resources via electron-builder's extraResources (`from: ../../dist/apps/server`), so no
// builder change is needed; main.ts reads the file from next to server/main.js at spawn time.
//
// Only an explicit allowlist is baked — never DATABASE_URL (main.ts sets that to the local
// SQLite path and it must win) nor AWS credential overrides. AWS_ENDPOINT_URL IS included:
// buildCognitoUrls() only routes JWKS/issuer to LocalStack when isLocalEnvironment() is true,
// which requires this var; without it a baked pool id would build a real-AWS URL for a local
// pool and login would fail at "Failed to retrieve signing key".

const ALLOWLIST = [
  'COGNITO_USER_POOL_ID',
  'COGNITO_USER_POOL_CLIENT_ID',
  'COGNITO_JWT_ISSUER',
  'AWS_REGION',
  'AWS_ENDPOINT_URL',
];

const workspaceRoot = path.resolve(__dirname, '../../..');
const envSourcePath = path.join(workspaceRoot, '.env.local');
const outPath = path.join(
  workspaceRoot,
  'dist/apps/server/server-runtime.env.json',
);

function parseEnvFile(text) {
  const vars = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip a single pair of surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

let baked = {};
if (fs.existsSync(envSourcePath)) {
  const all = parseEnvFile(fs.readFileSync(envSourcePath, 'utf8'));
  for (const key of ALLOWLIST) {
    if (all[key]) {
      baked[key] = all[key];
    }
  }
} else {
  console.warn(
    `[bake-server-env] WARNING: no ${envSourcePath}; baking empty config ` +
      '(packaged app will rely on runtime env vars / defaults)',
  );
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(baked, null, 2)}\n`);
console.log(
  `[bake-server-env] baked ${Object.keys(baked).length} var(s) -> ${outPath}`,
);
