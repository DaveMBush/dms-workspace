import { buildDatabaseUrl } from './build-database-url.function';
import { createConnectionPoolConfig } from './create-connection-pool-config.function';

interface PrismaConfig {
  log: Array<{ emit: 'event'; level: 'error' | 'info' | 'query' | 'warn' }>;
  datasources: {
    db: {
      url: string;
    };
  };
  errorFormat: 'minimal';
  transactionOptions: {
    maxWait: number;
    timeout: number;
  };
}

export function createBasePrismaConfig(
  isDevelopment: boolean = false
): PrismaConfig {
  const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';
  const poolConfig = createConnectionPoolConfig(provider);
  const databaseUrl = buildDatabaseUrl(
    provider,
    process.env.DATABASE_URL,
    poolConfig
  );

  return {
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],

    datasources: {
      db: {
        url: databaseUrl,
      },
    },

    errorFormat: 'minimal',

    transactionOptions: {
      maxWait: 5000,
      timeout: 15000,
    },
  };
}
