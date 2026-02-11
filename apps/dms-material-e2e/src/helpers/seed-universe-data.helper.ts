interface SeederResult {
  cleanup(): Promise<void>;
  symbols: string[];
}

interface RiskGroups {
  equitiesRiskGroup: { id: string };
  incomeRiskGroup: { id: string };
  taxFreeIncomeRiskGroup: { id: string };
}

// Snake case property names match database schema
/* eslint-disable @typescript-eslint/naming-convention -- Property names match database column names */
interface UniverseRecord {
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  ex_date: Date | null;
  most_recent_sell_date: Date | null;
  most_recent_sell_price: number | null;
  expired: boolean;
  is_closed_end_fund: boolean;
}
/* eslint-enable @typescript-eslint/naming-convention -- Re-enable naming convention */

/**
 * Generate unique identifier using cryptographically secure random values
 * @returns Unique ID string
 */
function generateUniqueId(): string {
  // Use crypto for secure random values instead of Math.random()
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  const randomStr = Array.from(randomBytes)
    .map(function byteToString(b: number): string {
      return b.toString(36);
    })
    .join('')
    .substring(0, 5);
  return `${Date.now()}-${randomStr}`;
}

/**
 * Create risk groups in the database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createRiskGroups(prisma: any): Promise<RiskGroups> {
  const equitiesRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Equities' },
    update: {},
    create: { name: 'Equities' },
  });

  const incomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Income' },
    update: {},
    create: { name: 'Income' },
  });

  const taxFreeIncomeRiskGroup = await prisma.risk_group.upsert({
    where: { name: 'Tax Free Income' },
    update: {},
    create: { name: 'Tax Free Income' },
  });

  return { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup };
}

/**
 * Create test universe data array
 */
function createTestDataArray(
  symbols: string[],
  equitiesId: string,
  incomeId: string,
  taxFreeId: string
): UniverseRecord[] {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 30);

  return [
    {
      symbol: symbols[0],
      risk_group_id: equitiesId,
      distribution: 1.25,
      distributions_per_year: 4,
      last_price: 50.0,
      ex_date: pastDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: true,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[1],
      risk_group_id: incomeId,
      distribution: 0.5,
      distributions_per_year: 12,
      last_price: 25.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[2],
      risk_group_id: taxFreeId,
      distribution: 0.75,
      distributions_per_year: 4,
      last_price: 30.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[3],
      risk_group_id: equitiesId,
      distribution: 2.0,
      distributions_per_year: 4,
      last_price: 100.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[4],
      risk_group_id: incomeId,
      distribution: 0.3,
      distributions_per_year: 12,
      last_price: 15.0,
      ex_date: futureDate,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  ];
}

/**
 * Seeds test data for universe table tests
 * Creates risk groups and universe records
 */
export async function seedUniverseData(): Promise<SeederResult> {
  // Import Prisma and adapter dynamically to avoid bundling issues
  const prismaClientImport = (await import('@prisma/client')).PrismaClient;
  const { PrismaBetterSqlite3 } = await import(
    '@prisma/adapter-better-sqlite3'
  );

  // Connect to the same database that the E2E backend server uses
  // The test database is always at: file:./test-database.db (relative to workspace root)
  // This matches apps/server/project.json e2e-server configuration
  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  const prisma = new prismaClientImport({ adapter });

  const uniqueId = generateUniqueId();
  const symbols = [
    `UTEST1-${uniqueId}`,
    `UTEST2-${uniqueId}`,
    `UTEST3-${uniqueId}`,
    `UTEST4-${uniqueId}`,
    `UTEST5-${uniqueId}`,
  ];

  try {
    // Create risk groups first
    const { equitiesRiskGroup, incomeRiskGroup, taxFreeIncomeRiskGroup } =
      await createRiskGroups(prisma);

    // Create test data records
    const testData = createTestDataArray(
      symbols,
      equitiesRiskGroup.id,
      incomeRiskGroup.id,
      taxFreeIncomeRiskGroup.id
    );

    // Insert all universe records
    await prisma.universe.createMany({
      data: testData,
    });

    console.log(`Seeded ${testData.length} universe records`);
  } catch (error) {
    console.error('Error seeding universe data:', error);
    await prisma.$disconnect();
    throw error;
  }

  // Return cleanup function that removes test data
  return {
    async cleanup(): Promise<void> {
      try {
        await prisma.universe.deleteMany({
          where: {
            symbol: {
              in: symbols,
            },
          },
        });
        console.log('Cleaned up universe test data');
      } catch (error) {
        console.error('Error cleaning up universe test data:', error);
      } finally {
        await prisma.$disconnect();
      }
    },
    symbols,
  };
}
