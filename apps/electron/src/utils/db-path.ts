import os from 'os';
import path from 'path';

export function resolveDbPath(): string {
  return path.join(os.homedir(), '.dms', 'dms.db');
}
