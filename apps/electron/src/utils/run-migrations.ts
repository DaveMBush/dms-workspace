import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';

function resolvePrismaCliPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'prisma-cli', 'prisma');
  }
  return path.resolve(__dirname, '../../../../node_modules/.bin/prisma');
}

function resolveMigrationSchemaPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'schema.prisma');
  }
  return path.resolve(__dirname, '../../../../prisma/schema.prisma');
}

export function runMigrations(): Promise<void> {
  return new Promise(function doRunMigrations(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const dbPath = path.join(app.getPath('userData'), 'dms.db');
    process.env['DATABASE_URL'] = `file:${dbPath}`;

    const prismaCliPath = resolvePrismaCliPath();
    const schemaPath = resolveMigrationSchemaPath();

    const child = spawn(prismaCliPath, ['migrate', 'deploy', `--schema=${schemaPath}`], {
      env: { ...process.env },
      stdio: 'pipe',
    });

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
            `prisma migrate deploy exited with code ${code ?? 'null'}${errDetail}`
          )
        );
      }
    });
  });
}
