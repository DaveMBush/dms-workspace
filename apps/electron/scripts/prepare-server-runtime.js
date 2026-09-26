const fs = require('fs');
const path = require('path');

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
const targetClient = path.join(serverRuntimeRoot, 'node_modules/.prisma/client');
const sourceSqlitePackage = path.resolve(
	path.dirname(require.resolve('better-sqlite3')),
	'..',
);
const targetSqlitePackage = path.join(
	serverRuntimeRoot,
	'node_modules/better-sqlite3',
);
const sqliteBinding = path.join(
	sourceSqlitePackage,
	'build',
	'Release',
	'better_sqlite3.node',
);
const targetSqliteBinding = path.join(
	targetSqlitePackage,
	'build',
	'Release',
	'better_sqlite3.node',
);

fs.rmSync(targetClient, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetClient), { recursive: true });
fs.cpSync(generatedClient, targetClient, { recursive: true });
fs.rmSync(targetSqlitePackage, { recursive: true, force: true });
fs.cpSync(sourceSqlitePackage, targetSqlitePackage, { recursive: true });
fs.mkdirSync(path.dirname(targetSqliteBinding), { recursive: true });
fs.copyFileSync(sqliteBinding, targetSqliteBinding);

// The server bundle resolves better-sqlite3 through pnpm's virtual store: from inside
// @prisma/adapter-better-sqlite3, require('better-sqlite3') lands on
// node_modules/.pnpm/better-sqlite3@<ver>/node_modules/better-sqlite3 — NOT the top-level
// copy above. The prod install does not build the native binding into that .pnpm copy, so
// without this step the packaged app fails at startup with "Cannot find module .../better_sqlite3.node".
const pnpmDir = path.join(serverRuntimeRoot, 'node_modules', '.pnpm');
if (fs.existsSync(pnpmDir)) {
	for (const entry of fs.readdirSync(pnpmDir)) {
		if (!/^better-sqlite3@/.test(entry)) continue;
		const pkgBuildRelease = path.join(
			pnpmDir,
			entry,
			'node_modules',
			'better-sqlite3',
			'build',
			'Release',
		);
		fs.mkdirSync(pkgBuildRelease, { recursive: true });
		fs.copyFileSync(sqliteBinding, path.join(pkgBuildRelease, 'better_sqlite3.node'));
	}
}
