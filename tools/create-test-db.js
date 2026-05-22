#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child = require('child_process');

// Usage: node tools/create-test-db.js <dest-path>
const dest = process.argv[2] || '../../test-database.db';
const destPath = path.resolve(process.cwd(), dest);
const dir = path.dirname(destPath);

/**
 * Seed essential test data using Prisma Client.
 * Creates the well-known account UUID used by multiple e2e test specs,
 * along with risk groups, universe entries, trades, and dividend deposits
 * so that summary charts render correctly.
 */
async function seedTestData() {
  // Use the same adapter approach as the server (Prisma v7 requires adapters).
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const { PrismaClient } = require('@prisma/client');
  const adapter = new PrismaBetterSqlite3({ url: `file:${destPath}` });
  const prisma = new PrismaClient({ adapter });

  try {
    // ── Risk Groups ──────────────────────────────────────────────────
    const equities = await prisma.risk_group.create({
      data: { name: 'Equities' },
    });
    const income = await prisma.risk_group.create({
      data: { name: 'Income' },
    });
    const taxFree = await prisma.risk_group.create({
      data: { name: 'Tax Free Income' },
    });

    // ── Universe entries (3 symbols, one per risk group) ─────────────
    const sym1 = await prisma.universe.create({
      data: {
        symbol: 'TESTEQ1',
        risk_group_id: equities.id,
        distribution: 2.5,
        distributions_per_year: 4,
        last_price: 150.0,
        ex_date: new Date('2025-06-15'),
        expired: false,
        is_closed_end_fund: true,
        createdAt: new Date('2099-01-01'),
      },
    });
    const sym2 = await prisma.universe.create({
      data: {
        symbol: 'TESTIN1',
        risk_group_id: income.id,
        distribution: 1.8,
        distributions_per_year: 12,
        last_price: 25.0,
        ex_date: new Date('2025-03-01'),
        expired: false,
        is_closed_end_fund: true,
        createdAt: new Date('2099-01-01'),
      },
    });
    const sym3 = await prisma.universe.create({
      data: {
        symbol: 'TESTTF1',
        risk_group_id: taxFree.id,
        distribution: 1.2,
        distributions_per_year: 12,
        last_price: 50.0,
        ex_date: new Date('2025-09-20'),
        expired: false,
        is_closed_end_fund: true,
        createdAt: new Date('2099-01-01'),
      },
    });

    // ── Account (well-known UUID used by account-summary e2e tests) ──
    const account = await prisma.accounts.create({
      data: {
        id: '1677e04f-ef9b-4372-adb3-b740443088dc',
        name: 'E2E Test Account',
      },
    });

    // ── Trades (open positions → sell_date is null) ──────────────────
    await prisma.trades.createMany({
      data: [
        {
          universeId: sym1.id,
          accountId: account.id,
          buy: 120.0,
          sell: 0,
          buy_date: new Date('2025-01-15'),
          quantity: 20,
          sell_date: null,
        },
        {
          universeId: sym2.id,
          accountId: account.id,
          buy: 22.0,
          sell: 0,
          buy_date: new Date('2025-02-10'),
          quantity: 100,
          sell_date: null,
        },
        {
          universeId: sym3.id,
          accountId: account.id,
          buy: 45.0,
          sell: 0,
          buy_date: new Date('2025-03-05'),
          quantity: 40,
          sell_date: null,
        },
      ],
    });

    // ── Closed trade (for sold positions & capital gains) ────────────
    await prisma.trades.create({
      data: {
        universeId: sym1.id,
        accountId: account.id,
        buy: 100.0,
        sell: 130.0,
        buy_date: new Date('2024-06-01'),
        quantity: 10,
        sell_date: new Date('2025-01-20'),
      },
    });

    // ── Dividend deposit type + deposits ─────────────────────────────
    const divType = await prisma.divDepositType.create({
      data: { name: 'Dividend' },
    });
    // "Deposit" type required by dividend-deposits-modal e2e tests
    await prisma.divDepositType.create({
      data: { name: 'Deposit' },
    });
    await prisma.divDeposits.createMany({
      data: [
        {
          date: new Date('2025-01-15'),
          amount: 250.0,
          accountId: account.id,
          divDepositTypeId: divType.id,
          universeId: sym1.id,
        },
        {
          date: new Date('2025-02-15'),
          amount: 180.0,
          accountId: account.id,
          divDepositTypeId: divType.id,
          universeId: sym2.id,
        },
        {
          date: new Date('2025-03-15'),
          amount: 120.0,
          accountId: account.id,
          divDepositTypeId: divType.id,
          universeId: sym3.id,
        },
      ],
    });

    // ── Additional well-known accounts for scroll regression tests ──────
    // These accounts are pre-seeded with 60 open trades, 60 sold trades, and
    // 60 div deposits each (cycling through the 3 test universe symbols) so
    // that SmartNgRX receives a non-empty array at server start time and does
    // NOT cache openTrades:[] for the 15-30-minute dirty window.
    await prisma.accounts.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'E2E Test Account 2',
      },
    });
    await prisma.accounts.create({
      data: {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'E2E Test Account 3',
      },
    });

    // ── Pre-seeded scroll regression rows for well-known accounts 2 & 3 ─
    // 60 open + 60 sold + 60 div-deposits per account, cycling sym1/sym2/sym3.
    const scrollSymIds = [sym1.id, sym2.id, sym3.id];
    const scrollUniverseIds = Array.from(
      { length: 60 },
      (_, i) => scrollSymIds[i % 3]
    );
    const SCROLL_ACCOUNT_IDS = [
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
    ];
    for (const accId of SCROLL_ACCOUNT_IDS) {
      // Open trades (sell_date = null)
      await prisma.trades.createMany({
        data: scrollUniverseIds.map((universeId, i) => ({
          universeId,
          accountId: accId,
          buy: 50.0 + i,
          sell: 0,
          buy_date: new Date('2025-01-15'),
          quantity: 10,
          sell_date: null,
        })),
      });
      // Sold trades (sell_date populated)
      await prisma.trades.createMany({
        data: scrollUniverseIds.map((universeId, i) => ({
          universeId,
          accountId: accId,
          buy: 50.0 + i,
          sell: 55.0 + i,
          buy_date: new Date('2025-01-15'),
          quantity: 10,
          sell_date: new Date('2025-06-15'),
        })),
      });
      // Div deposits
      await prisma.divDeposits.createMany({
        data: scrollUniverseIds.map((universeId, i) => ({
          accountId: accId,
          divDepositTypeId: divType.id,
          universeId,
          date: new Date(2025, i % 12, (i % 28) + 1),
          amount: 10.0 + i,
        })),
      });
    }

    console.log('Test data seeded successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Remove existing file if any
  if (fs.existsSync(destPath)) {
    fs.unlinkSync(destPath);
  }

  // Ensure a blank file exists so Prisma can open it
  fs.writeFileSync(destPath, Buffer.from(''));
  console.log(`Created empty test database file at ${destPath}`);

  // Apply Prisma schema to the new SQLite file using Prisma CLI
  // This will push the schema (no migrations required) so the DB has the correct tables.
  const env = Object.assign({}, process.env, {
    DATABASE_URL: `file:${destPath}`,
  });

  console.log('Applying Prisma schema to test database...');
  // Use npx so local workspace Prisma is used if available
  child.execSync('npx prisma db push --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env,
  });

  console.log('Prisma schema applied successfully.');

  // Seed essential e2e test data
  console.log('Seeding test data...');
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed test data', err);
      process.exit(2);
    });
} catch (err) {
  console.error('Failed to create or prepare test database', err);
  process.exit(2);
}
