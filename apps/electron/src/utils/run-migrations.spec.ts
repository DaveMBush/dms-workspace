import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigrations } from './run-migrations';

// Mock electron app before importing the module under test
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}));

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

interface MockApp {
  isPackaged: boolean;
}

/** Simple mock for the dev (Prisma CLI) path — no stdin/stdout interaction needed. */
function makeMockProcess(exitCode: number): EventEmitter & {
  stderr: EventEmitter;
} {
  const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  proc.stderr = new EventEmitter();
  // Emit close asynchronously so handlers can be attached first
  setTimeout(function emitClose(): void {
    proc.emit('close', exitCode);
  }, 0);
  return proc;
}

interface MockEngineProcess extends EventEmitter {
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  stdout: EventEmitter;
  stderr: EventEmitter;
}

/**
 * Mock for the packaged (schema-engine JSON-RPC) path.
 * Emits `spawn`, then optionally writes `rpcResponse` on stdout before `close`.
 */
function makeMockEngineProcess(
  rpcResponse?: string,
  exitCode: number = 0,
  progressRequest?: string,
): MockEngineProcess {
  const proc = new EventEmitter() as MockEngineProcess;
  proc.stdin = { write: vi.fn(), end: vi.fn() };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(function triggerSpawn(): void {
    proc.emit('spawn');
    setTimeout(function triggerClose(): void {
      if (progressRequest !== undefined) {
        proc.stdout.emit('data', Buffer.from(progressRequest + '\n'));
      }
      if (rpcResponse !== undefined) {
        proc.stdout.emit('data', Buffer.from(rpcResponse + '\n'));
      }
      proc.emit('close', exitCode);
    }, 0);
  }, 0);
  return proc;
}

describe('runMigrations', () => {
  const mockApp = app as unknown as MockApp;
  const mockSpawn = spawn as ReturnType<typeof vi.fn>;

  let savedResourcesPath: string | undefined;

  beforeEach(function setup(): void {
    vi.clearAllMocks();
    mockApp.isPackaged = false;
    savedResourcesPath = process.resourcesPath;
    vi.spyOn(fs, 'readdirSync').mockReturnValue([] as fs.Dirent<Buffer>[]);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('provider = "sqlite"');
  });

  afterEach(function teardown(): void {
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      savedResourcesPath!;
  });

  // ────────────────────────────────────────────────────────────
  // Development path (isPackaged=false) — regression-protected
  // ────────────────────────────────────────────────────────────

  it('resolves when prisma migrate deploy exits with code 0', async () => {
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await expect(runMigrations()).resolves.toBeUndefined();
  });

  it('rejects when prisma migrate deploy exits with non-zero code', async () => {
    mockSpawn.mockReturnValue(makeMockProcess(1));

    await expect(runMigrations()).rejects.toThrow(
      /prisma migrate deploy exited with code 1/,
    );
  });

  it('resolves Prisma CLI from node_modules in development (isPackaged=false)', async () => {
    mockApp.isPackaged = false;
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [cliPath] = mockSpawn.mock.calls[0] as [string, string[], object];
    expect(cliPath).toContain(path.join('node_modules', '.bin', 'prisma'));
  });

  it('resolves schema from prisma/ folder in development (isPackaged=false)', async () => {
    mockApp.isPackaged = false;
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [, args] = mockSpawn.mock.calls[0] as [string, string[], object];
    const schemaArg = args.find((a) => a.startsWith('--schema='));
    expect(schemaArg).toContain('prisma/schema.prisma');
  });

  it('rejects with spawn error when child process fails to start', async () => {
    const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
    proc.stderr = new EventEmitter();
    setTimeout(function emitError(): void {
      proc.emit('error', new Error('ENOENT: file not found'));
    }, 0);
    mockSpawn.mockReturnValue(proc);

    await expect(runMigrations()).rejects.toThrow(
      'Failed to spawn Prisma CLI: ENOENT: file not found',
    );
  });

  // ────────────────────────────────────────────────────────────
  // Packaged path (isPackaged=true) — schema-engine via JSON-RPC
  // ────────────────────────────────────────────────────────────

  it('packaged: spawns schema-engine binary from resourcesPath (not prisma CLI)', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    mockSpawn.mockReturnValue(makeMockEngineProcess(noOpResponse, 0));

    await runMigrations();

    const [binaryPath] = mockSpawn.mock.calls[0] as [string, string[], object];
    expect(binaryPath).toContain(
      path.join('/mock/resources', 'prisma-migration-engine'),
    );
    expect(binaryPath).toContain('schema-engine-');
    expect(binaryPath).not.toContain('prisma-cli');
    expect(binaryPath).not.toContain(path.join('.bin', 'prisma'));

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: passes --datamodels and --datasource args to schema-engine', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';
    const originalDbUrl = process.env['DATABASE_URL'];
    process.env['DATABASE_URL'] = 'file:/mock/home/.dms/dms.db';

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    mockSpawn.mockReturnValue(makeMockEngineProcess(noOpResponse, 0));

    await runMigrations();

    const [, args] = mockSpawn.mock.calls[0] as [string, string[], object];
    const datamodelsIdx = args.indexOf('--datamodels');
    expect(datamodelsIdx).not.toBe(-1);
    expect(args[datamodelsIdx + 1]).toBe(
      '/mock/resources/prisma/schema.prisma',
    );

    const datasourceIdx = args.indexOf('--datasource');
    expect(datasourceIdx).not.toBe(-1);
    const datasourceJson = JSON.parse(args[datasourceIdx + 1] ?? '{}') as {
      url?: string;
    };
    expect(datasourceJson.url).toBe('file:/mock/home/.dms/dms.db');

    process.env['DATABASE_URL'] = originalDbUrl;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: sends applyMigrations JSON-RPC request to engine stdin', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    const mockProc = makeMockEngineProcess(noOpResponse, 0);
    mockSpawn.mockReturnValue(mockProc);

    await runMigrations();

    expect(mockProc.stdin.write).toHaveBeenCalledOnce();
    const writtenArg = mockProc.stdin.write.mock.calls[0]?.[0] as string;
    const rpcMsg = JSON.parse(writtenArg.trim()) as {
      method?: string;
      params?: { migrationsList?: unknown };
    };
    expect(rpcMsg.method).toBe('applyMigrations');
    expect(rpcMsg.params).toHaveProperty('migrationsList');
    expect(rpcMsg.params!.migrationsList).toEqual(
      expect.objectContaining({
        baseDir: expect.any(String),
        lockfile: expect.any(Object),
        migrationDirectories: expect.any(Array),
        shadowDbInitScript: '',
      }),
    );
    expect(mockProc.stdin.end).toHaveBeenCalledOnce();

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: sends Prisma 7.9 migration list with lockfile and SQL content', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      {
        name: '20250101000000_init',
        isDirectory: () => true,
      } as unknown as fs.Dirent<Buffer>,
      {
        name: '20250201000000_add_user',
        isDirectory: () => true,
      } as unknown as fs.Dirent<Buffer>,
    ]);

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    const mockProc = makeMockEngineProcess(noOpResponse, 0);
    mockSpawn.mockReturnValue(mockProc);

    await runMigrations();

    const writtenArg = mockProc.stdin.write.mock.calls[0]?.[0] as string;
    const rpcMsg = JSON.parse(writtenArg.trim()) as {
      params?: {
        filters?: { externalEnums?: string[]; externalTables?: string[] };
        migrationsList?: {
          baseDir?: string;
          lockfile?: { content?: string; path?: string };
          migrationDirectories?: Array<{
            migrationFile?: {
              content?: { tag?: string; value?: string };
              path?: string;
            };
            path?: string;
          }>;
          shadowDbInitScript?: string;
        };
      };
    };
    expect(rpcMsg.params!.filters).toEqual({
      externalEnums: [],
      externalTables: [],
    });
    const migrationsList = rpcMsg.params!.migrationsList!;
    expect(migrationsList.baseDir).toBe('/mock/resources/prisma/migrations');
    expect(migrationsList.lockfile).toEqual({
      path: 'migration_lock.toml',
      content: 'provider = "sqlite"',
    });
    expect(migrationsList.shadowDbInitScript).toBe('');
    expect(migrationsList.migrationDirectories).toEqual([
      {
        path: '20250101000000_init',
        migrationFile: {
          path: 'migration.sql',
          content: { tag: 'ok', value: 'provider = "sqlite"' },
        },
      },
      {
        path: '20250201000000_add_user',
        migrationFile: {
          path: 'migration.sql',
          content: { tag: 'ok', value: 'provider = "sqlite"' },
        },
      },
    ]);
    expect(mockProc.stdin.end).toHaveBeenCalledOnce();

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: resolves when schema-engine exits code 0 with no pending migrations (no-op)', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    mockSpawn.mockReturnValue(makeMockEngineProcess(noOpResponse, 0));

    await expect(runMigrations()).resolves.toBeUndefined();

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: acknowledges schema-engine print requests before awaiting the migration result', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const noOpResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: [] },
    });
    const progressRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'print',
      params: { content: 'Applying migration `20250613192713_init`' },
    });
    const mockProc = makeMockEngineProcess(noOpResponse, 0, progressRequest);
    mockSpawn.mockReturnValue(mockProc);

    await runMigrations();

    expect(mockProc.stdin.write).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(mockProc.stdin.write.mock.calls[1]?.[0] as string),
    ).toEqual({
      jsonrpc: '2.0',
      id: 0,
      result: {},
    });

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('packaged: resolves when schema-engine exits code 0 and migrations were applied', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath2 = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const appliedResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { appliedMigrationNames: ['20250613192713_init'] },
    });
    mockSpawn.mockReturnValue(makeMockEngineProcess(appliedResponse, 0));

    await expect(runMigrations()).resolves.toBeUndefined();

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath2;
  });

  it('packaged: rejects when schema-engine exits with non-zero code', async () => {
    mockApp.isPackaged = true;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    mockSpawn.mockReturnValue(makeMockEngineProcess(undefined, 1));

    await expect(runMigrations()).rejects.toThrow(
      /schema-engine exited with code 1/,
    );
  });

  it('packaged: rejects when JSON-RPC response contains an error', async () => {
    mockApp.isPackaged = true;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const errorResponse = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32000, message: 'connection refused' },
    });
    mockSpawn.mockReturnValue(makeMockEngineProcess(errorResponse, 0));

    await expect(runMigrations()).rejects.toThrow(
      /Migration failed: connection refused/,
    );
  });

  it('packaged: rejects with spawn error when schema-engine fails to start', async () => {
    mockApp.isPackaged = true;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    const proc = new EventEmitter() as MockEngineProcess;
    proc.stdin = { write: vi.fn(), end: vi.fn() };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    setTimeout(function emitError(): void {
      proc.emit('error', new Error('ENOENT: binary not found'));
    }, 0);
    mockSpawn.mockReturnValue(proc);

    await expect(runMigrations()).rejects.toThrow(
      /Failed to spawn schema-engine: ENOENT: binary not found/,
    );
  });
});
