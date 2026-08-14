import fs from 'fs';
import path from 'path';

interface MigrationFileContent {
  tag: 'error' | 'ok';
  value: string;
}

interface MigrationDirectory {
  migrationFile: {
    content: MigrationFileContent;
    path: string;
  };
  path: string;
}

function readMigrationLockfile(migrationsPath: string): string | null {
  try {
    return fs.readFileSync(
      path.join(migrationsPath, 'migration_lock.toml'),
      'utf8',
    );
  } catch {
    return null;
  }
}

function readMigrationDirectory(
  migrationsPath: string,
  entry: fs.Dirent,
): MigrationDirectory {
  const migrationFilePath = path.join(
    migrationsPath,
    entry.name,
    'migration.sql',
  );
  let content: MigrationFileContent;
  try {
    content = {
      tag: 'ok',
      value: fs.readFileSync(migrationFilePath, 'utf8'),
    };
  } catch (error) {
    content = { tag: 'error', value: String(error) };
  }

  return {
    path: entry.name,
    migrationFile: {
      path: 'migration.sql',
      content,
    },
  };
}

function readMigrationDirectories(migrationsPath: string): MigrationDirectory[] {
  return fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter(function isMigrationDirectory(entry: fs.Dirent): boolean {
      return entry.isDirectory() && !entry.name.startsWith('.');
    })
    .sort(function sortByName(a: fs.Dirent, b: fs.Dirent): number {
      return a.name.localeCompare(b.name);
    })
    .map(function toMigrationDirectory(entry: fs.Dirent): MigrationDirectory {
      return readMigrationDirectory(migrationsPath, entry);
    });
}

export function buildMigrationRequest(migrationsPath: string): string {
  const migrationDirectories = readMigrationDirectories(migrationsPath);
  return (
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'applyMigrations',
      params: {
        filters: {
          externalEnums: [],
          externalTables: [],
        },
        migrationsList: {
          baseDir: migrationsPath,
          lockfile: {
            path: 'migration_lock.toml',
            content: readMigrationLockfile(migrationsPath),
          },
          shadowDbInitScript: '',
          migrationDirectories,
        },
      },
    }) + '\n'
  );
}
