import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/** Platform-specific schema-engine binary name (Prisma 7.x). */
function getSchemaEngineBinaryName(): string {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64'
      ? 'schema-engine-darwin-arm64'
      : 'schema-engine-darwin';
  }
  if (process.platform === 'win32') {
    return 'schema-engine-windows.exe';
  }
  return 'schema-engine-debian-openssl-3.0.x';
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

/** Build the JSON-RPC applyMigrations request payload. */
function buildApplyMigrationsRequest(migrationsPath: string): string {
  const migrationsList = fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      migrationName: entry.name,
      migrationDirectoryPath: path.join(migrationsPath, entry.name),
    }));
  return (
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'applyMigrations',
      params: { migrationsList },
    }) + '\n'
  );
}

/** Returns true if the line is non-empty after trimming. */
function isNonEmptyLine(l: string): boolean {
  return l.trim().length > 0;
}

/**
 * Try to parse a single stdout line as a JSON-RPC error.
 * Returns the error message string, or null if no error is present.
 */
function tryParseJsonRpcError(line: string): string | null {
  try {
    const parsed = JSON.parse(line) as { error?: { message?: string } };
    if (parsed.error) {
      return parsed.error.message ?? JSON.stringify(parsed.error);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scan all JSON-RPC response lines for an error object.
 * Calls `reject` and returns true if one is found.
 */
function parseRpcResponse(
  responseText: string,
  reject: (err: Error) => void
): boolean {
  const lines = responseText.split('\n').filter(isNonEmptyLine);
  for (const line of lines) {
    const errMsg = tryParseJsonRpcError(line);
    if (errMsg !== null) {
      reject(new Error(`Migration failed: ${errMsg}`));
      return true;
    }
  }
  return false;
}

interface EngineHandlerConfig {
  child: ChildProcess;
  migrationsPath: string;
  reject(err: Error): void;
  resolve(): void;
  stderr: string[];
  stdout: string[];
}

/** Attach all event handlers to the schema-engine child process. */
function attachEngineHandlers(config: EngineHandlerConfig): void {
  const { child, stdout, stderr, resolve, reject, migrationsPath } = config;

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
    try {
      const request = buildApplyMigrationsRequest(migrationsPath);
      child.stdin?.write(request);
      child.stdin?.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

  child.on('close', function onClose(code: number | null): void {
    const responseText = stdout.join('');
    if (parseRpcResponse(responseText, reject)) {
      return;
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

    attachEngineHandlers({
      child,
      stdout,
      stderr,
      resolve,
      reject,
      migrationsPath,
    });
  });
}

export function runMigrations(): Promise<void> {
  if (app.isPackaged) {
    return runMigrationsPackaged();
  }
  return runMigrationsDev();
}
