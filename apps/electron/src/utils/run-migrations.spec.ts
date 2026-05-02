import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock electron app before importing the module under test
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
    isPackaged: false,
  },
}));

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
import path from 'path';

import { app } from 'electron';

import { runMigrations } from './run-migrations';

interface MockApp {
  getPath: ReturnType<typeof vi.fn>;
  isPackaged: boolean;
}

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

describe('runMigrations', () => {
  const mockApp = app as unknown as MockApp;
  const mockSpawn = spawn as ReturnType<typeof vi.fn>;

  beforeEach(function setup(): void {
    vi.clearAllMocks();
    mockApp.isPackaged = false;
    mockApp.getPath.mockReturnValue('/mock/userData');
  });

  it('resolves when prisma migrate deploy exits with code 0', async () => {
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await expect(runMigrations()).resolves.toBeUndefined();
  });

  it('rejects when prisma migrate deploy exits with non-zero code', async () => {
    mockSpawn.mockReturnValue(makeMockProcess(1));

    await expect(runMigrations()).rejects.toThrow(
      /prisma migrate deploy exited with code 1/
    );
  });

  it('sets DATABASE_URL env var to the user-data db path', async () => {
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    expect(process.env['DATABASE_URL']).toBe('file:/mock/userData/dms.db');
  });

  it('resolves Prisma CLI from node_modules in development (isPackaged=false)', async () => {
    mockApp.isPackaged = false;
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [cliPath] = mockSpawn.mock.calls[0] as [string, string[], object];
    expect(cliPath).toContain(path.join('node_modules', '.bin', 'prisma'));
  });

  it('resolves Prisma CLI from resourcesPath in packaged app (isPackaged=true)', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [cliPath] = mockSpawn.mock.calls[0] as [string, string[], object];
    expect(cliPath).toBe('/mock/resources/prisma-cli/prisma');

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('resolves schema from prisma/ folder in development (isPackaged=false)', async () => {
    mockApp.isPackaged = false;
    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [, args] = mockSpawn.mock.calls[0] as [string, string[], object];
    const schemaArg = args.find((a) => a.startsWith('--schema='));
    expect(schemaArg).toContain('prisma/schema.prisma');
  });

  it('resolves schema from resourcesPath in packaged app (isPackaged=true)', async () => {
    mockApp.isPackaged = true;
    const originalResourcesPath = process.resourcesPath;
    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      '/mock/resources';

    mockSpawn.mockReturnValue(makeMockProcess(0));

    await runMigrations();

    const [, args] = mockSpawn.mock.calls[0] as [string, string[], object];
    const schemaArg = args.find((a) => a.startsWith('--schema='));
    expect(schemaArg).toBe('--schema=/mock/resources/schema.prisma');

    (process as NodeJS.Process & { resourcesPath: string }).resourcesPath =
      originalResourcesPath;
  });

  it('rejects with spawn error when child process fails to start', async () => {
    const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
    proc.stderr = new EventEmitter();
    setTimeout(function emitError(): void {
      proc.emit('error', new Error('ENOENT: file not found'));
    }, 0);
    mockSpawn.mockReturnValue(proc);

    await expect(runMigrations()).rejects.toThrow(
      'Failed to spawn Prisma CLI: ENOENT: file not found'
    );
  });
});
