import type { PrismaClient } from '@prisma/client';

import { generateUniqueId } from './generate-unique-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

interface DivDepositsSeederResult extends SeederResultBase {
  accountId: string;
  amounts: number[];
}

/**
 * Get or create a divDepositType named "Dividend" and return its id.
 */
async function getOrCreateDivDepositType(
  prisma: PrismaClient
): Promise<string> {
  const existing = await prisma.divDepositType.findFirst({
    where: { name: 'Dividend' },
  });
  if (existing !== null) {
    return existing.id;
  }
  const created = await prisma.divDepositType.create({
    data: { name: 'Dividend' },
  });
  return created.id;
}

// Amounts seeded in insertion order: 50, 200, 100.
// Correct ascending sort: $50.00, $100.00, $200.00  (rows 0, 2, 1)
// Buggy insertion order:  $50.00, $200.00, $100.00  (rows 0, 1, 2)
const SEEDED_AMOUNTS = [50, 200, 100];

async function createDivDeposits(
  prisma: PrismaClient,
  accountId: string,
  divDepositTypeId: string
): Promise<void> {
  await prisma.divDeposits.createMany({
    data: [
      // Row 0: 2025-01-15, amount=50  (earliest, smallest)
      {
        accountId,
        divDepositTypeId,
        universeId: null,
        date: new Date('2025-01-15'),
        amount: SEEDED_AMOUNTS[0],
      },
      // Row 1: 2025-06-01, amount=200 (latest, largest)
      {
        accountId,
        divDepositTypeId,
        universeId: null,
        date: new Date('2025-06-01'),
        amount: SEEDED_AMOUNTS[1],
      },
      // Row 2: 2025-03-10, amount=100 (middle)
      {
        accountId,
        divDepositTypeId,
        universeId: null,
        date: new Date('2025-03-10'),
        amount: SEEDED_AMOUNTS[2],
      },
    ],
  });
}

export async function seedDivDepositsE2eData(): Promise<DivDepositsSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const accountName = `E2E-DD-Acct-${uniqueId}`;
  let accountId = '';

  try {
    const divDepositTypeId = await getOrCreateDivDepositType(prisma);
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await createDivDeposits(prisma, accountId, divDepositTypeId);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountId,
    amounts: SEEDED_AMOUNTS,
    symbols: [],
    cleanup: async function cleanupDivDepositsData(): Promise<void> {
      try {
        await prisma.divDeposits.deleteMany({ where: { accountId } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
