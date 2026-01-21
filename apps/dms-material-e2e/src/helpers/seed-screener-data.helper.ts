/**
 * Seed screener test data for E2E tests
 *
 * This function should be called in test.beforeEach to set up isolated test data
 * Each test gets its own clean dataset to avoid collisions
 */
export async function seedScreenerData(): Promise<{
  cleanup: () => Promise<void>;
  symbols: string[];
}> {
  // Import Prisma and adapter dynamically to avoid bundling issues
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');

  // Connect to the same database that the E2E backend server uses
  // The e2e-server target sets DATABASE_URL to file:./test-database.db
  const testDbUrl = 'file:./test-database.db';
  const adapter = new PrismaBetterSqlite3({ url: testDbUrl });
  const prisma = new PrismaClient({ adapter });

  // Generate unique symbols for this test run using timestamp and random suffix
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const symbols = [
    `AAPL-${uniqueId}`,
    `MSFT-${uniqueId}`,
    `BND-${uniqueId}`,
    `VWOB-${uniqueId}`,
    `VTEB-${uniqueId}`,
  ];

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

    // Insert test screener data with unique symbols one by one to get IDs
    const screenerRecords = [];
    
    screenerRecords.push(await prisma.screener.create({
      data: {
        symbol: symbols[0],
        risk_group_id: equitiesRiskGroup.id,
        has_volitility: false,
        objectives_understood: false,
        graph_higher_before_2008: false,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 0.0,
      },
    }));
    
    screenerRecords.push(await prisma.screener.create({
      data: {
        symbol: symbols[1],
        risk_group_id: equitiesRiskGroup.id,
        has_volitility: true,
        objectives_understood: false,
        graph_higher_before_2008: false,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 0.0,
      },
    }));
    
    screenerRecords.push(await prisma.screener.create({
      data: {
        symbol: symbols[2],
        risk_group_id: incomeRiskGroup.id,
        has_volitility: false,
        objectives_understood: true,
        graph_higher_before_2008: false,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 0.0,
      },
    }));
    
    screenerRecords.push(await prisma.screener.create({
      data: {
        symbol: symbols[3],
        risk_group_id: incomeRiskGroup.id,
        has_volitility: true,
        objectives_understood: false,
        graph_higher_before_2008: true,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 0.0,
      },
    }));
    
    screenerRecords.push(await prisma.screener.create({
      data: {
        symbol: symbols[4],
        risk_group_id: taxFreeIncomeRiskGroup.id,
        has_volitility: false,
        objectives_understood: false,
        graph_higher_before_2008: false,
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 0.0,
      },
    }));

    // Return cleanup function and symbols
    return {
      symbols,
      cleanup: async () => {
        try {
          await prisma.screener.deleteMany({
            where: {
              symbol: {
                in: symbols,
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
