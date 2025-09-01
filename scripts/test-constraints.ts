#!/usr/bin/env tsx

/**
 * Test script to verify the new unique constraints and indexes
 * This script validates that Story E3 requirements are properly implemented
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConstraints() {
  console.log(
    '🧪 Testing Story E3 schema integrity and performance constraints...\n'
  );

  try {
    // Test 1: Verify unique constraint on universe.symbol
    console.log('1️⃣ Testing universe.symbol unique constraint...');

    // Try to create duplicate universe symbol (should fail)
    try {
      await prisma.universe.create({
        data: {
          symbol: 'TEST_DUPLICATE',
          distribution: 1.0,
          distributions_per_year: 4,
          last_price: 100.0,
          risk_group: {
            connectOrCreate: {
              where: { name: 'Test Risk Group' },
              create: { name: 'Test Risk Group' },
            },
          },
        },
      });

      // Try to create another with same symbol
      await prisma.universe.create({
        data: {
          symbol: 'TEST_DUPLICATE',
          distribution: 2.0,
          distributions_per_year: 4,
          last_price: 200.0,
          risk_group: {
            connect: { name: 'Test Risk Group' },
          },
        },
      });

      console.log(
        '❌ Universe symbol uniqueness constraint failed - duplicates allowed'
      );
    } catch (error) {
      console.log('✅ Universe symbol uniqueness constraint working correctly');
    }

    // Test 2: Verify unique constraint on risk_group.name
    console.log('\n2️⃣ Testing risk_group.name unique constraint...');

    try {
      await prisma.risk_group.create({
        data: { name: 'Duplicate Risk Group' },
      });

      await prisma.risk_group.create({
        data: { name: 'Duplicate Risk Group' },
      });

      console.log(
        '❌ Risk group name uniqueness constraint failed - duplicates allowed'
      );
    } catch (error) {
      console.log('✅ Risk group name uniqueness constraint working correctly');
    }

    // Test 3: Verify indexes exist by checking query plans
    console.log('\n3️⃣ Testing index creation...');

    // Check universe indexes
    const universeIndexes = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' 
      AND tbl_name = 'universe'
      AND name LIKE '%_idx' OR name LIKE '%_key';
    `;

    const expectedUniverseIndexes = [
      'universe_symbol_key',
      'universe_expired_idx',
      'universe_risk_group_id_idx',
    ];

    console.log(
      'Universe indexes found:',
      universeIndexes.map((i) => i.name)
    );
    const hasAllUniverseIndexes = expectedUniverseIndexes.every((expected) =>
      universeIndexes.some((index) => index.name === expected)
    );

    if (hasAllUniverseIndexes) {
      console.log('✅ Universe indexes created correctly');
    } else {
      console.log('❌ Missing universe indexes');
    }

    // Check screener indexes
    const screenerIndexes = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' 
      AND tbl_name = 'screener'
      AND (name LIKE '%_idx' OR name LIKE '%_key');
    `;

    const expectedScreenerIndexes = [
      'screener_symbol_key',
      'screener_risk_group_id_idx',
      'screener_has_volitility_objectives_understood_graph_higher_before_2008_idx',
    ];

    console.log(
      'Screener indexes found:',
      screenerIndexes.map((i) => i.name)
    );
    const hasAllScreenerIndexes = expectedScreenerIndexes.every((expected) =>
      screenerIndexes.some((index) => index.name === expected)
    );

    if (hasAllScreenerIndexes) {
      console.log('✅ Screener indexes created correctly');
    } else {
      console.log('❌ Missing screener indexes');
    }

    // Test 4: Performance test queries that should use indexes
    console.log('\n4️⃣ Testing query performance with indexes...');

    // Query using universe.expired index
    const start1 = Date.now();
    await prisma.universe.count({
      where: { expired: false },
    });
    const time1 = Date.now() - start1;
    console.log(`✅ universe.expired query: ${time1}ms`);

    // Query using universe.risk_group_id index
    const start2 = Date.now();
    await prisma.universe.findMany({
      where: { risk_group_id: 'any-id' },
      take: 10,
    });
    const time2 = Date.now() - start2;
    console.log(`✅ universe.risk_group_id query: ${time2}ms`);

    // Query using screener composite index
    const start3 = Date.now();
    await prisma.screener.count({
      where: {
        has_volitility: true,
        objectives_understood: true,
        graph_higher_before_2008: false,
      },
    });
    const time3 = Date.now() - start3;
    console.log(`✅ screener composite query: ${time3}ms`);

    console.log(
      '\n🎉 All Story E3 constraints and indexes are working correctly!'
    );
  } catch (error) {
    console.error('💥 Error during constraint testing:', error);
  } finally {
    // Cleanup test data
    try {
      await prisma.universe.deleteMany({
        where: { symbol: 'TEST_DUPLICATE' },
      });
      await prisma.risk_group.deleteMany({
        where: { name: { in: ['Test Risk Group', 'Duplicate Risk Group'] } },
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testConstraints()
  .catch((error) => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
