import * as path from 'path';

import type { PrismaClient } from '@prisma/client';

export async function initializePrismaClient(): Promise<PrismaClient> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );
  // Resolve the DB path relative to the Nx workspace root so that seeders
  // always write to the same database that the running e2e-server reads from,
  // regardless of the Playwright process CWD (which differs in git worktrees).
  const workspaceRoot =
    process.env['NX_WORKSPACE_ROOT_PATH'] ??
    process.env['NX_WORKSPACE_ROOT'] ??
    process.cwd();
  const testDbUrl = `file:${path.resolve(workspaceRoot, 'test-database.db')}`;
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  return new prismaClientImport({ adapter });
}
