// Guards the desktop (Electron) build wiring so a regression that bakes the web
// "production" environment into the packaged app — surfacing an AWS Cognito login
// screen instead of mock auth — is caught by CI rather than discovered at release.
//
// Two layers:
//   A. Static config guard  — project.json must default to the `electron` build
//      configuration, which file-replaces environment.ts with environment.electron.ts.
//   B. Built-artifact guard — the compiled bundle under dist/apps/dms-material must
//      carry the electron env's markers and none of the prod env's placeholders.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { environment } from './environment.electron';

interface FileReplacement {
  replace: string;
  with: string;
}
interface BuildConfiguration {
  fileReplacements?: FileReplacement[];
}
interface ProjectJson {
  targets: {
    build: {
      defaultConfiguration?: string;
      configurations?: Record<string, BuildConfiguration>;
    };
  };
}

const projectJsonPath = path.resolve(__dirname, '../../project.json');
// apps/dms-material/src/environments -> workspace root is four levels up.
const distDir = path.resolve(__dirname, '../../../../dist/apps/dms-material');

function readProjectJson(): ProjectJson {
  return JSON.parse(readFileSync(projectJsonPath, 'utf8')) as ProjectJson;
}

/** Recursively collect built JS chunks under the dms-material output dir. */
function collectBundleFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectBundleFiles(full));
    } else if (/\.(js|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Electron build wiring', () => {
  it('builds with the "electron" configuration by default', () => {
    expect(readProjectJson().targets.build.defaultConfiguration).toBe(
      'electron',
    );
  });

  it('replaces environment.ts with environment.electron.ts in the electron config', () => {
    const replacements =
      readProjectJson().targets.build.configurations?.electron
        ?.fileReplacements ?? [];
    expect(replacements).toContainEqual({
      replace: 'apps/dms-material/src/environments/environment.ts',
      with: 'apps/dms-material/src/environments/environment.electron.ts',
    });
  });

  it('uses mock auth and a relative API URL (no Cognito, no placeholder)', () => {
    expect(environment.production).toBe(true);
    expect(environment.auth.useMockAuth).toBe(true);
    expect(environment.apiUrl).toBe('/api');
    const serialized = JSON.stringify(environment);
    expect(serialized).not.toContain('PLACEHOLDER_API_URL');
    expect(serialized).not.toContain('amazonaws.com');
  });

  it('bakes the electron env into the built bundle (no prod placeholders)', () => {
    const files = collectBundleFiles(distDir);
    if (files.length === 0) {
      // No build output present — ad-hoc local run without a prior build. The CI
      // gate always runs dms-material:build before dms-material:test, so this only
      // skips locally; in CI the bundle is guaranteed to exist and is asserted on.
      return;
    }
    const bundle = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(bundle).toContain('1.0.0-electron');
    expect(bundle).not.toContain('PLACEHOLDER_API_URL');
  });
});
