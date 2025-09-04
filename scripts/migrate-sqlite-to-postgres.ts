#!/usr/bin/env tsx
/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script migrates data from SQLite to PostgreSQL while preserving
 * data integrity and relationships.
 */

import { PrismaClient as SqlitePrismaClient } from '@prisma/client';
import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

interface MigrationConfig {
  sqliteUrl: string;
  postgresUrl: string;
  backupDir: string;
  dryRun: boolean;
  verbose: boolean;
}

interface MigrationStats {
  tablesProcessed: number;
  recordsMigrated: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

class DatabaseMigrator {
  private sqliteClient: SqlitePrismaClient;
  private postgresClient: PostgresPrismaClient;
  private config: MigrationConfig;
  private stats: MigrationStats;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.stats = {
      tablesProcessed: 0,
      recordsMigrated: 0,
      errors: [],
      startTime: new Date(),
    };

    // Initialize Prisma clients
    this.sqliteClient = new SqlitePrismaClient({
      datasources: {
        db: {
          url: config.sqliteUrl,
        },
      },
    });

    this.postgresClient = new PostgresPrismaClient({
      datasources: {
        db: {
          url: config.postgresUrl,
        },
      },
    });
  }

  async migrate(): Promise<MigrationStats> {
    try {
      console.log('🚀 Starting SQLite to PostgreSQL migration...');
      console.log(`📊 Dry run mode: ${this.config.dryRun}`);

      if (!this.config.dryRun) {
        await this.createBackup();
      }

      await this.validateConnections();
      await this.migrateTables();

      this.stats.endTime = new Date();
      console.log('✅ Migration completed successfully!');
      this.printSummary();

      return this.stats;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`Migration failed: ${error}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async createBackup(): Promise<void> {
    console.log('📦 Creating backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      this.config.backupDir,
      `migration-backup-${timestamp}.json`
    );

    await fs.mkdir(this.config.backupDir, { recursive: true });

    const allData = {
      accounts: await this.sqliteClient.accounts.findMany(),
      risk_group: await this.sqliteClient.risk_group.findMany(),
      universe: await this.sqliteClient.universe.findMany(),
      trades: await this.sqliteClient.trades.findMany(),
      holidays: await this.sqliteClient.holidays.findMany(),
      divDepositType: await this.sqliteClient.divDepositType.findMany(),
      divDeposits: await this.sqliteClient.divDeposits.findMany(),
      screener: await this.sqliteClient.screener.findMany(),
    };

    await fs.writeFile(backupPath, JSON.stringify(allData, null, 2));
    console.log(`📦 Backup created: ${backupPath}`);
  }

  private async validateConnections(): Promise<void> {
    console.log('🔍 Validating database connections...');

    try {
      await this.sqliteClient.$connect();
      console.log('✅ SQLite connection successful');
    } catch (error) {
      throw new Error(`SQLite connection failed: ${error}`);
    }

    try {
      await this.postgresClient.$connect();
      console.log('✅ PostgreSQL connection successful');
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error}`);
    }
  }

  private async migrateTables(): Promise<void> {
    // Migration order is important to respect foreign key constraints
    const migrationOrder = [
      'accounts',
      'risk_group',
      'divDepositType',
      'holidays',
      'universe',
      'trades',
      'divDeposits',
      'screener',
    ];

    for (const tableName of migrationOrder) {
      await this.migrateTable(tableName);
      this.stats.tablesProcessed++;
    }
  }

  private async migrateTable(tableName: string): Promise<void> {
    console.log(`📋 Migrating table: ${tableName}`);

    try {
      const data = await (this.sqliteClient as any)[tableName].findMany();

      if (data.length === 0) {
        console.log(`⚠️  Table ${tableName} is empty, skipping...`);
        return;
      }

      console.log(`📊 Found ${data.length} records in ${tableName}`);

      if (this.config.dryRun) {
        console.log(
          `🔍 Dry run: Would migrate ${data.length} records from ${tableName}`
        );
        this.stats.recordsMigrated += data.length;
        return;
      }

      // Clear existing data in PostgreSQL (careful!)
      await (this.postgresClient as any)[tableName].deleteMany({});

      // Batch insert data
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await (this.postgresClient as any)[tableName].createMany({
          data: batch,
          skipDuplicates: true,
        });

        if (this.config.verbose) {
          console.log(
            `  📝 Inserted batch ${Math.ceil(
              (i + batchSize) / batchSize
            )} of ${Math.ceil(data.length / batchSize)}`
          );
        }
      }

      this.stats.recordsMigrated += data.length;
      console.log(
        `✅ Successfully migrated ${data.length} records from ${tableName}`
      );
    } catch (error) {
      const errorMsg = `Failed to migrate table ${tableName}: ${error}`;
      console.error(`❌ ${errorMsg}`);
      this.stats.errors.push(errorMsg);

      if (!this.config.dryRun) {
        throw error; // Stop migration on error
      }
    }
  }

  private async validateMigration(): Promise<void> {
    if (this.config.dryRun) {
      console.log('🔍 Skipping validation in dry run mode');
      return;
    }

    console.log('🔍 Validating migration...');

    const tables = [
      'accounts',
      'risk_group',
      'universe',
      'trades',
      'holidays',
      'divDepositType',
      'divDeposits',
      'screener',
    ];

    for (const table of tables) {
      const sqliteCount = await (this.sqliteClient as any)[table].count();
      const postgresCount = await (this.postgresClient as any)[table].count();

      if (sqliteCount !== postgresCount) {
        const errorMsg = `Record count mismatch for ${table}: SQLite=${sqliteCount}, PostgreSQL=${postgresCount}`;
        console.error(`❌ ${errorMsg}`);
        this.stats.errors.push(errorMsg);
      } else {
        console.log(`✅ ${table}: ${postgresCount} records matched`);
      }
    }

    if (this.stats.errors.length === 0) {
      console.log('✅ Migration validation passed!');
    }
  }

  private printSummary(): void {
    const duration = this.stats.endTime
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;

    console.log('\n📊 Migration Summary');
    console.log('================');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📋 Tables processed: ${this.stats.tablesProcessed}`);
    console.log(`📝 Records migrated: ${this.stats.recordsMigrated}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }

  private async cleanup(): Promise<void> {
    await this.sqliteClient.$disconnect();
    await this.postgresClient.$disconnect();
  }
}

async function main() {
  const config: MigrationConfig = {
    sqliteUrl: process.env.SQLITE_DATABASE_URL || 'file:./database.db',
    postgresUrl: process.env.DATABASE_URL || '',
    backupDir: process.env.BACKUP_DIR || './backups',
    dryRun: process.env.DRY_RUN === 'true',
    verbose: process.env.VERBOSE === 'true',
  };

  // Validate required environment variables
  if (!config.postgresUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔧 Migration Configuration:');
  console.log(`  SQLite URL: ${config.sqliteUrl}`);
  console.log(
    `  PostgreSQL URL: ${config.postgresUrl.replace(/:[^:@]*@/, ':****@')}`
  );
  console.log(`  Backup Dir: ${config.backupDir}`);
  console.log(`  Dry Run: ${config.dryRun}`);
  console.log(`  Verbose: ${config.verbose}`);
  console.log();

  const migrator = new DatabaseMigrator(config);

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseMigrator, MigrationConfig, MigrationStats };
