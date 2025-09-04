#!/usr/bin/env tsx
/**
 * PostgreSQL Database Seeding Script
 *
 * This script seeds a fresh PostgreSQL database with initial data
 * for development and testing environments.
 */

import { PrismaClient } from '@prisma/client';

interface SeedConfig {
  environment: 'dev' | 'staging' | 'test';
  verbose: boolean;
}

class DatabaseSeeder {
  private prisma: PrismaClient;
  private config: SeedConfig;

  constructor(config: SeedConfig) {
    this.config = config;
    this.prisma = new PrismaClient();
  }

  async seed(): Promise<void> {
    try {
      console.log(
        `🌱 Seeding PostgreSQL database for ${this.config.environment} environment...`
      );

      await this.seedAccounts();
      await this.seedRiskGroups();
      await this.seedDivDepositTypes();
      await this.seedHolidays();

      if (this.config.environment === 'dev') {
        await this.seedDevelopmentData();
      }

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async seedAccounts(): Promise<void> {
    console.log('👤 Seeding accounts...');

    const accounts = [
      { name: 'Trading Account' },
      { name: 'Retirement Account' },
      { name: 'Savings Account' },
    ];

    for (const account of accounts) {
      await this.prisma.accounts.upsert({
        where: { name: account.name },
        update: {},
        create: account,
      });
    }

    console.log(`✅ Seeded ${accounts.length} accounts`);
  }

  private async seedRiskGroups(): Promise<void> {
    console.log('🎯 Seeding risk groups...');

    const riskGroups = [
      { name: 'Low Risk' },
      { name: 'Medium Risk' },
      { name: 'High Risk' },
      { name: 'Speculative' },
    ];

    for (const group of riskGroups) {
      await this.prisma.risk_group.upsert({
        where: { name: group.name },
        update: {},
        create: group,
      });
    }

    console.log(`✅ Seeded ${riskGroups.length} risk groups`);
  }

  private async seedDivDepositTypes(): Promise<void> {
    console.log('💰 Seeding dividend deposit types...');

    const divDepositTypes = [
      { name: 'Dividend' },
      { name: 'Interest' },
      { name: 'Capital Gains' },
      { name: 'Return of Capital' },
    ];

    for (const type of divDepositTypes) {
      await this.prisma.divDepositType.upsert({
        where: { id: type.name }, // Assuming we use name as unique identifier
        update: {},
        create: type,
      });
    }

    console.log(`✅ Seeded ${divDepositTypes.length} dividend deposit types`);
  }

  private async seedHolidays(): Promise<void> {
    console.log('🎉 Seeding market holidays for current year...');

    const currentYear = new Date().getFullYear();
    const holidays = [
      { date: new Date(`${currentYear}-01-01`), name: "New Year's Day" },
      {
        date: new Date(`${currentYear}-01-16`),
        name: 'Martin Luther King Jr. Day',
      },
      { date: new Date(`${currentYear}-02-20`), name: "Presidents' Day" },
      { date: new Date(`${currentYear}-03-29`), name: 'Good Friday' },
      { date: new Date(`${currentYear}-05-27`), name: 'Memorial Day' },
      { date: new Date(`${currentYear}-06-19`), name: 'Juneteenth' },
      { date: new Date(`${currentYear}-07-04`), name: 'Independence Day' },
      { date: new Date(`${currentYear}-09-04`), name: 'Labor Day' },
      { date: new Date(`${currentYear}-11-28`), name: 'Thanksgiving Day' },
      { date: new Date(`${currentYear}-12-25`), name: 'Christmas Day' },
    ];

    for (const holiday of holidays) {
      await this.prisma.holidays.upsert({
        where: { date: holiday.date },
        update: {},
        create: holiday,
      });
    }

    console.log(`✅ Seeded ${holidays.length} market holidays`);
  }

  private async seedDevelopmentData(): Promise<void> {
    console.log('🧪 Seeding development test data...');

    // Get the created accounts and risk groups
    const accounts = await this.prisma.accounts.findMany();
    const riskGroups = await this.prisma.risk_group.findMany();
    const divDepositTypes = await this.prisma.divDepositType.findMany();

    if (accounts.length === 0 || riskGroups.length === 0) {
      console.warn(
        '⚠️  No accounts or risk groups found, skipping development data'
      );
      return;
    }

    // Seed universe data
    const universeData = [
      {
        symbol: 'AAPL',
        distribution: 0.25,
        distributions_per_year: 4,
        last_price: 180.5,
        risk_group_id: riskGroups[1].id, // Medium Risk
      },
      {
        symbol: 'MSFT',
        distribution: 0.3,
        distributions_per_year: 4,
        last_price: 340.75,
        risk_group_id: riskGroups[1].id, // Medium Risk
      },
      {
        symbol: 'GOOGL',
        distribution: 0.0,
        distributions_per_year: 0,
        last_price: 142.25,
        risk_group_id: riskGroups[2].id, // High Risk
      },
      {
        symbol: 'JNJ',
        distribution: 1.12,
        distributions_per_year: 4,
        last_price: 160.8,
        risk_group_id: riskGroups[0].id, // Low Risk
      },
    ];

    const createdUniverse = [];
    for (const stock of universeData) {
      const created = await this.prisma.universe.upsert({
        where: { symbol: stock.symbol },
        update: {},
        create: stock,
      });
      createdUniverse.push(created);
    }

    // Seed some sample trades
    const sampleTrades = [
      {
        universeId: createdUniverse[0].id,
        accountId: accounts[0].id,
        buy: 175.25,
        sell: 180.5,
        buy_date: new Date('2024-01-15'),
        sell_date: new Date('2024-02-15'),
        quantity: 100,
      },
      {
        universeId: createdUniverse[1].id,
        accountId: accounts[0].id,
        buy: 320.75,
        sell: 340.75,
        buy_date: new Date('2024-02-01'),
        sell_date: new Date('2024-03-01'),
        quantity: 50,
      },
      {
        universeId: createdUniverse[3].id,
        accountId: accounts[1].id,
        buy: 155.5,
        sell: null,
        buy_date: new Date('2024-03-01'),
        sell_date: null,
        quantity: 200,
      },
    ];

    for (const trade of sampleTrades) {
      await this.prisma.trades.create({ data: trade });
    }

    // Seed dividend deposits
    if (divDepositTypes.length > 0) {
      const dividendDeposits = [
        {
          date: new Date('2024-01-31'),
          amount: 25.0,
          accountId: accounts[0].id,
          divDepositTypeId: divDepositTypes[0].id,
          universeId: createdUniverse[0].id,
        },
        {
          date: new Date('2024-02-28'),
          amount: 15.0,
          accountId: accounts[0].id,
          divDepositTypeId: divDepositTypes[0].id,
          universeId: createdUniverse[1].id,
        },
        {
          date: new Date('2024-03-31'),
          amount: 56.0,
          accountId: accounts[1].id,
          divDepositTypeId: divDepositTypes[0].id,
          universeId: createdUniverse[3].id,
        },
      ];

      for (const deposit of dividendDeposits) {
        await this.prisma.divDeposits.create({ data: deposit });
      }

      console.log(`✅ Seeded ${dividendDeposits.length} dividend deposits`);
    }

    // Seed screener data
    const screenerData = [
      {
        symbol: 'NVDA',
        distribution: 0.16,
        distributions_per_year: 4,
        last_price: 875.5,
        risk_group_id: riskGroups[3].id, // Speculative
        has_volitility: true,
        objectives_understood: true,
        graph_higher_before_2008: false,
      },
      {
        symbol: 'KO',
        distribution: 1.84,
        distributions_per_year: 4,
        last_price: 60.25,
        risk_group_id: riskGroups[0].id, // Low Risk
        has_volitility: false,
        objectives_understood: true,
        graph_higher_before_2008: true,
      },
    ];

    for (const stock of screenerData) {
      await this.prisma.screener.upsert({
        where: { symbol: stock.symbol },
        update: {},
        create: stock,
      });
    }

    console.log(
      `✅ Seeded ${universeData.length} universe entries, ${sampleTrades.length} trades, and ${screenerData.length} screener entries`
    );
  }
}

async function main() {
  const config: SeedConfig = {
    environment: (process.env.NODE_ENV as 'dev' | 'staging' | 'test') || 'dev',
    verbose: process.env.VERBOSE === 'true',
  };

  console.log('🔧 Seeding Configuration:');
  console.log(`  Environment: ${config.environment}`);
  console.log(`  Verbose: ${config.verbose}`);
  console.log();

  const seeder = new DatabaseSeeder(config);

  try {
    await seeder.seed();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseSeeder, SeedConfig };
