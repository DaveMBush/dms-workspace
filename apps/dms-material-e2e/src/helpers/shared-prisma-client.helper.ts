import type { PrismaClient } from '@prisma/client';

export async function initializePrismaClient(): Promise<PrismaClient> {
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );
  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  return new prismaClientImport({ adapter });
}
