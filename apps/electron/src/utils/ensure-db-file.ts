import fs from 'fs';
import path from 'path';

export function ensureDbFile(dbPath: string): void {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  // On POSIX, enforce 0o700 even if the directory already existed
  if (process.platform !== 'win32') {
    fs.chmodSync(dir, 0o700);
  }
  // Open for append — creates if missing, does NOT truncate existing file
  fs.closeSync(fs.openSync(dbPath, 'a'));
}
