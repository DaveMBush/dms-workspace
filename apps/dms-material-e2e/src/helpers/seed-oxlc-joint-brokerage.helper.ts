import type { PrismaClient } from '@prisma/client';

import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';
import { createRiskGroups } from './shared-risk-groups.helper';

const ACCOUNT_NAME = 'E2E OXLC Joint Brokerage';
const OXLC_SYMBOL = 'OXLC';

interface OxlcJointBrokerageSeederResult extends SeederResultBase {
  accountName: string;
}

async function cleanupOxlcData(
  prisma: PrismaClient,
  accountId: string,
  oxlcUniverseId: string | null
): Promise<void> {
  try {
    await prisma.trades.deleteMany({ where: { accountId } });
    await prisma.divDeposits.deleteMany({ where: { accountId } });
    await prisma.accounts.deleteMany({ where: { name: ACCOUNT_NAME } });
    if (oxlcUniverseId !== null) {
      await prisma.trades.deleteMany({ where: { universeId: oxlcUniverseId } });
      await prisma.divDeposits.deleteMany({
        where: { universeId: oxlcUniverseId },
      });
      await prisma.universe.deleteMany({ where: { id: oxlcUniverseId } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seed prerequisites for the OXLC Joint Brokerage E2E test.
 *
 * Ensures risk groups exist so the import pipeline can classify OXLC.
 * The CSV import itself creates: the OXLC universe entry, the account, trades,
 * and dividend deposits.  This seeder only creates the preconditions.
 *
 * Returns the account name used in the CSV fixture and a cleanup function.
 */
export async function seedOxlcJointBrokerageData(): Promise<OxlcJointBrokerageSeederResult> {
  const prisma = await initializePrismaClient();

  let oxlcUniverseIdToDelete: string | null = null;

  try {
    // Ensure risk groups exist (required by buildCefClassification during import)
    await createRiskGroups(prisma);

    // Check whether OXLC already exists in universe before the import runs.
    // If it does not exist, the BUY row in the CSV will auto-create it and we
    // must clean it up after the test.
    const existingOxlc = await prisma.universe.findFirst({
      where: { symbol: OXLC_SYMBOL },
    });
    if (existingOxlc === null) {
      // Mark sentinel: we will capture the created universe id after the import
      // via a separate query in the cleanup factory below.
      oxlcUniverseIdToDelete = '__pending__';
    }
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    accountName: ACCOUNT_NAME,
    symbols: [OXLC_SYMBOL],
    cleanup: async function cleanupOxlcJointBrokerageData(): Promise<void> {
      const account = await prisma.accounts.findFirst({
        where: { name: ACCOUNT_NAME },
      });
      const accountId = account?.id ?? '';

      let resolvedOxlcUniverseId: string | null = null;
      if (oxlcUniverseIdToDelete === '__pending__') {
        const oxlcEntry = await prisma.universe.findFirst({
          where: { symbol: OXLC_SYMBOL },
        });
        resolvedOxlcUniverseId = oxlcEntry?.id ?? null;
      }

      await cleanupOxlcData(prisma, accountId, resolvedOxlcUniverseId);
    },
  };
}
