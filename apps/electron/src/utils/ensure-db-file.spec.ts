import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureDbFile } from './ensure-db-file';

describe('ensureDbFile', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(function setup(): void {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
    dbPath = path.join(tmpDir, '.dms', 'dms.db');
  });

  afterEach(function teardown(): void {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the parent directory if it does not exist', () => {
    ensureDbFile(dbPath);
    const dir = path.dirname(dbPath);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('creates the db file if it does not exist', () => {
    ensureDbFile(dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('creates the directory with mode 0o700 on POSIX', () => {
    if (process.platform === 'win32') {
      return;
    }
    ensureDbFile(dbPath);
    const dir = path.dirname(dbPath);
    const stats = fs.statSync(dir);
    // eslint-disable-next-line no-bitwise -- bitwise AND needed to extract file permission bits from mode
    expect(stats.mode & 0o777).toBe(0o700);
  });

  it('leaves the existing file untouched when it already exists', () => {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    const originalContent = 'existing data';
    fs.writeFileSync(dbPath, originalContent);
    const statBefore = fs.statSync(dbPath);

    ensureDbFile(dbPath);

    const contentAfter = fs.readFileSync(dbPath, 'utf8');
    expect(contentAfter).toBe(originalContent);
    const statAfter = fs.statSync(dbPath);
    expect(statAfter.size).toBe(statBefore.size);
  });

  it('creates an empty file (size 0) when the path is new', () => {
    ensureDbFile(dbPath);
    const stats = fs.statSync(dbPath);
    expect(stats.size).toBe(0);
  });

  it('is idempotent — calling twice does not throw or corrupt the file', () => {
    expect(() => {
      ensureDbFile(dbPath);
      ensureDbFile(dbPath);
    }).not.toThrow();
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
