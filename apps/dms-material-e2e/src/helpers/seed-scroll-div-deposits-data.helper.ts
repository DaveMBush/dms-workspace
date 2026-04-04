import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface SeederResult {
  accountId: string;
  cleanup(): Promise<void>;
}

const ROW_COUNT = 60;

/**
 * Get or create a divDepositType named "Deposit" and return its id.
 */
async function getOrCreateDepositType(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Deposit' },
  });
  if (existing !== null) {
    return existing.id;
  }
  try {
    const created = await prisma.divDepositType.create({
      data: { name: 'Deposit' },
    });
    return created.id;
  } catch {
    // Another process may have created it concurrently; re-fetch
    const refetched = await prisma.divDepositType.findFirst({
      where: { name: 'Deposit' },
    });
    if (refetched === null) {
      throw new Error('Failed to create or find Deposit type');
    }
    return refetched.id;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma createMany requires untyped batch data */
function createBulkDeposits(
  accountId: string,
  divDepositTypeId: string
): any[] {
  return Array.from(
    { length: ROW_COUNT },
    function makeDeposit(_: unknown, i: number) {
      return {
        accountId,
        divDepositTypeId,
        universeId: null,
        date: new Date(2025, 0, (i % 28) + 1),
        amount: 10.0 + i,
      };
    }
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable */

/**
 * Seeds 60 dividend deposit rows for scroll testing.
 * Creates an account and bulk "Deposit"-type entries (no symbol required).
 */
export async function seedScrollDivDepositsData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-DD-Scroll-${uniqueId}`;
  let accountId = '';

  try {
    const divDepositTypeId = await getOrCreateDepositType(prisma);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await prisma.divDeposits.createMany({
      data: createBulkDeposits(accountId, divDepositTypeId),
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    cleanup: async function cleanupScrollDivDeposits(): Promise<void> {
      try {
        await prisma.divDeposits.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
