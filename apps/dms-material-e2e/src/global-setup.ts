import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Global setup for E2E tests
 * Runs Prisma migrations to set up the test database schema
 */
export default async function globalSetup(): Promise<void> {
  console.log('🔧 Setting up E2E test database...');

  const testDbPath = join(
    __dirname,
    '../../../apps/dms-material-e2e/test-database.db'
  );
  const databaseUrl = `file:${testDbPath}`;

  try {
    // Run Prisma migrations to create schema
    console.log('📦 Running Prisma migrations...');
    execSync('pnpm prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      cwd: join(__dirname, '../../../'),
    });

    console.log('✅ E2E test database ready');
  } catch (error) {
    console.error('❌ Failed to set up test database:', error);
    throw error;
  }
}
