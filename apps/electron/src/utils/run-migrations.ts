import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';

/** Platform-specific schema-engine binary name (Prisma 7.x). */
function getSchemaEngineBinaryName(): string {
  switch (process.platform) {
    case 'darwin':
      return process.arch === 'arm64'
        ? 'schema-engine-darwin-arm64'
        : 'schema-engine-darwin';
    case 'win32':
      return 'schema-engine-windows.exe';
    default:
      return 'schema-engine-debian-openssl-3.0.x';
  }
}

function resolveSchemaEnginePath(): string {
  return path.join(
    process.resourcesPath,
    'prisma-migration-engine',
    getSchemaEngineBinaryName()
  );
}

function resolveMigrationsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'prisma', 'migrations');
  }
  return path.resolve(__dirname, '../../../../prisma/migrations');
}

function resolveSchemaPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'prisma', 'schema.prisma');
  }
  return path.resolve(__dirname, '../../../../prisma/schema.prisma');
}

function resolvePrismaCliPath(): string {
  return path.resolve(__dirname, '../../../../node_modules/.bin/prisma');
}

/**
 * Development path: use Prisma CLI (requires Node on the dev machine).
 * Keeps the dev feedback loop unchanged.
 */
function runMigrationsDev(): Promise<void> {
  const prismaCliPath = resolvePrismaCliPath();
  const schemaPath = resolveSchemaPath();

  return new Promise(function doRunMigrationsDev(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const child = spawn(
      prismaCliPath,
      ['migrate', 'deploy', `--schema=${schemaPath}`],
      {
        env: { ...process.env },
        stdio: 'pipe',
      }
    );

    const stderr: string[] = [];

    child.stderr?.on('data', function onStderr(chunk: Buffer): void {
      stderr.push(chunk.toString());
    });

    child.on('error', function onError(err: Error): void {
      reject(new Error(`Failed to spawn Prisma CLI: ${err.message}`));
    });

    child.on('close', function onClose(code: number | null): void {
      if (code === 0) {
        resolve();
      } else {
        const errMsg = stderr.join('').trim();
        const errDetail = errMsg.length > 0 ? `\n${errMsg}` : '';
        reject(
          new Error(
            `prisma migrate deploy exited with code ${
              code ?? 'null'
            }${errDetail}`
          )
        );
      }
    });
  });
}

/**
 * Packaged path: invoke the bundled schema-engine binary via JSON-RPC over
 * stdio.  No Node binary on the user's PATH is required — the binary is a
 * native executable bundled alongside the app in `process.resourcesPath`.
 */
function runMigrationsPackaged(): Promise<void> {
  const enginePath = resolveSchemaEnginePath();
  const schemaPath = resolveSchemaPath();
  const migrationsPath = resolveMigrationsPath();
  const datasource = JSON.stringify({ url: process.env['DATABASE_URL'] });

  return new Promise(function doRunMigrationsPackaged(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const child = spawn(
      enginePath,
      ['--datamodels', schemaPath, '--datasource', datasource],
      {
        env: { ...process.env },
        stdio: 'pipe',
      }
    );

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout?.on('data', function onStdout(chunk: Buffer): void {
      stdout.push(chunk.toString());
    });

    child.stderr?.on('data', function onStderr(chunk: Buffer): void {
      stderr.push(chunk.toString());
    });

    child.on('error', function onError(err: Error): void {
      reject(new Error(`Failed to spawn schema-engine: ${err.message}`));
    });

    child.on('spawn', function onSpawn(): void {
      const request =
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'applyMigrations',
          params: { migrationsDirectoryPath: migrationsPath },
        }) + '\n';
      child.stdin?.write(request);
      child.stdin?.end();
    });

    child.on('close', function onClose(code: number | null): void {
      const responseText = stdout.join('');
      // Check for a JSON-RPC error in any response line before inspecting exit code
      const lines = responseText.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as {
            error?: { message?: string };
            result?: unknown;
          };
          if (parsed.error) {
            const errMsg = parsed.error.message ?? JSON.stringify(parsed.error);
            reject(new Error(`Migration failed: ${errMsg}`));
            return;
          }
        } catch {
          // Non-JSON diagnostic line — skip
        }
      }

      if (code === 0) {
        resolve();
      } else {
        const errMsg = stderr.join('').trim();
        const errDetail = errMsg.length > 0 ? `\n${errMsg}` : '';
        reject(
          new Error(
            `schema-engine exited with code ${code ?? 'null'}${errDetail}`
          )
        );
      }
    });
  });
}

export function runMigrations(): Promise<void> {
  if (app.isPackaged) {
    return runMigrationsPackaged();
  }
  return runMigrationsDev();
}
