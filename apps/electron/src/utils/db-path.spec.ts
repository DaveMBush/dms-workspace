import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
  },
  homedir: vi.fn(),
}));

import os from 'os';
import path from 'path';

describe('resolveDbPath', () => {
  const mockHomedir = os.homedir as ReturnType<typeof vi.fn>;

  beforeEach(function setup(): void {
    vi.clearAllMocks();
  });

  afterEach(function teardown(): void {
    vi.restoreAllMocks();
  });

  it('returns the correct POSIX path when homedir is /home/dave', async () => {
    mockHomedir.mockReturnValue('/home/dave');
    const { resolveDbPath } = await import('./db-path');
    expect(resolveDbPath()).toBe('/home/dave/.dms/dms.db');
  });

  it('joins homedir with .dms and dms.db using path.join', async () => {
    const testHome = '/home/testuser';
    mockHomedir.mockReturnValue(testHome);
    const { resolveDbPath } = await import('./db-path');
    expect(resolveDbPath()).toBe(path.join(testHome, '.dms', 'dms.db'));
  });

  it('always produces .dms/dms.db as the last two path segments for a Windows-style home dir', async () => {
    const winHome = 'C:\\Users\\dave';
    mockHomedir.mockReturnValue(winHome);
    const { resolveDbPath } = await import('./db-path');
    const result = resolveDbPath();
    // Split on both / and \ so the assertion holds on any platform
    const segments = result.split(/[\\/]+/).filter(Boolean);
    expect(segments[segments.length - 1]).toBe('dms.db');
    expect(segments[segments.length - 2]).toBe('.dms');
    expect(result).toContain(winHome);
  });
});
