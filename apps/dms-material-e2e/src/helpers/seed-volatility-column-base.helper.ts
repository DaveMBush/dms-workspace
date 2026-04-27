import { buildMonthlyDates } from './build-monthly-dates.helper';
import { buildUniverseCreateData } from './build-universe-create-data.helper';
import { cleanupUniverseOnError } from './cleanup-universe-on-error.helper';
import { generateUniqueId } from './generate-unique-id.helper';
import { getOrCreateDivDepositTypeId } from './get-or-create-div-deposit-type-id.helper';
import { getOrCreateRiskGroupId } from './get-or-create-risk-group-id.helper';
import type { SeederResultBase } from './seeder-result-base.types';
import { initializePrismaClient } from './shared-prisma-client.helper';

const STEADY_AMOUNT = 1.0;
const MONTHS_TO_SEED = 12;
const STORED_VOLATILITY = 'steady';

interface VolatilityColumnSeederResult extends SeederResultBase {
  symbol: string;
}

function buildDepositData(
  accountId: string,
  divDepositTypeId: string,
  universeId: string
): Array<{
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string;
}> {
  return buildMonthlyDates(MONTHS_TO_SEED).map(function buildDepositRecord(
    date: Date
  ) {
    return {
      date,
      amount: STEADY_AMOUNT,
      accountId,
      divDepositTypeId,
      universeId,
    };
  });
}

export async function seedVolatilityColumnE2eData(
  symbolPrefix: string,
  accountPrefix: string
): Promise<VolatilityColumnSeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbol = `${symbolPrefix}${uniqueId}`;
  const accountName = `${accountPrefix}${uniqueId}`;
  let universeId = '';
  let accountId = '';

  try {
    const riskGroupId = await getOrCreateRiskGroupId(prisma);
    const divDepositTypeId = await getOrCreateDivDepositTypeId(prisma);
    const universe = await prisma.universe.create({
      data: buildUniverseCreateData(symbol, riskGroupId, STORED_VOLATILITY),
    });
    universeId = universe.id;
    const account = await prisma.accounts.create({
      data: { name: accountName },
    });
    accountId = account.id;
    await prisma.divDeposits.createMany({
      data: buildDepositData(accountId, divDepositTypeId, universeId),
    });
  } catch (error) {
    await cleanupUniverseOnError(prisma, universeId, accountId);
    await prisma.$disconnect();
    throw error;
  }

  return {
    symbol,
    symbols: [symbol],
    cleanup: async function cleanupVolatilityColumnData(): Promise<void> {
      try {
        await prisma.divDeposits.deleteMany({ where: { universeId } });
        await prisma.universe.deleteMany({ where: { symbol } });
        await prisma.accounts.deleteMany({ where: { name: accountName } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
