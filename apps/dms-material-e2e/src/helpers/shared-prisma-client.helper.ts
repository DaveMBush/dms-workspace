import * as path from 'path';
import type { PrismaClient } from '@prisma/client';

export async function initializePrismaClient(): Promise<PrismaClient> {
  const prismaClientImport = (await import('@prisma/client/index'))
    .PrismaClient;
  const { PrismaBetterSqlite3: prismaBetterSqlite3 } =
    await import('@prisma/adapter-better-sqlite3');
  const repoRelativeTestDbUrl = `file:${path.resolve(
    __dirname,
    '../../../../test-database.db',
  )}`;
  const testDbUrl = process.env['E2E_DATABASE_URL'] ?? repoRelativeTestDbUrl;
  const adapter = new prismaBetterSqlite3({ url: testDbUrl });
  return new prismaClientImport({ adapter });
}
