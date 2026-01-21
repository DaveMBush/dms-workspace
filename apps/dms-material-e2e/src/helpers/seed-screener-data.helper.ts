/**
 * Seed screener test data for E2E tests
 *
 * This function should be called in test.beforeEach to set up isolated test data
 * Each test gets its own clean dataset to avoid collisions
 */
export async function seedScreenerData(): Promise<{
  cleanup: () => Promise<void>;
}> {
  // Import Prisma and adapter dynamically to avoid bundling issues
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');

  // Connect to the same database that the E2E backend server uses
  // The e2e-server target sets DATABASE_URL to file:./test-database.db
  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // First, get or create risk groups
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

    // Clean up any existing test screener data to avoid duplicates
    await prisma.screener.deleteMany({
      where: {
        symbol: {
          in: ['AAPL', 'MSFT', 'BND', 'VWOB', 'VTEB'],
        },
      },
    });

    // Insert test screener data
    await prisma.screener.createMany({
      data: [
        {
          symbol: 'AAPL',
          risk_group_id: equitiesRiskGroup.id,
          has_volitility: false,
          objectives_understood: false,
          graph_higher_before_2008: false,
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 0.0,
        },
        {
          symbol: 'MSFT',
          risk_group_id: equitiesRiskGroup.id,
          has_volitility: true,
          objectives_understood: false,
          graph_higher_before_2008: false,
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 0.0,
        },
        {
          symbol: 'BND',
          risk_group_id: incomeRiskGroup.id,
          has_volitility: false,
          objectives_understood: true,
          graph_higher_before_2008: false,
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 0.0,
        },
        {
          symbol: 'VWOB',
          risk_group_id: incomeRiskGroup.id,
          has_volitility: true,
          objectives_understood: false,
          graph_higher_before_2008: true,
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 0.0,
        },
        {
          symbol: 'VTEB',
          risk_group_id: taxFreeIncomeRiskGroup.id,
          has_volitility: false,
          objectives_understood: false,
          graph_higher_before_2008: false,
          distribution: 0.0,
          distributions_per_year: 0,
          last_price: 0.0,
        },
      ],
    });

    // Return cleanup function
    return {
      cleanup: async () => {
        try {
          await prisma.screener.deleteMany({
            where: {
              symbol: {
                in: ['AAPL', 'MSFT', 'BND', 'VWOB', 'VTEB'],
              },
            },
          });
        } finally {
          await prisma.$disconnect();
        }
      },
    };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
