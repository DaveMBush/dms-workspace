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
