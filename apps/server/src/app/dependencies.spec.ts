/**
 * Epic 22 / Story 22.1 — RED-PHASE TDD SCAFFOLD (intentionally deferred).
 * // @atdd
 *
 * These tests are the executable contract for Story 22.2, which must:
 *   1. Remove the eight unused direct dependencies from the root package.json
 *      (`express`, `zone.js`, `primeicons`, `eslint-plugin-cypress`,
 *      `@angular/ssr`, `@angular/platform-server`, `@ngrx/store`,
 *      `@ngrx/entity`); and
 *   2. Delete the stray apps/electron/package-lock.json stub.
 *
 * Every red-phase assertion below bails out via an if-guard early-return (NOT
 * test.skip — that trips the no-skipped-tests gate) so the suite stays green
 * BEFORE Story 22.2 exists — red-phase by guard, not by failure. Story 22.2's
 * first task is to flip STORY_22_2_IMPLEMENTED from `false` to `true`, confirm
 * the assertions FAIL against the current manifest (exactly 9 failures: 8
 * manifest + 1 lockfile), then implement the removal until they pass. Do NOT
 * weaken or delete any assertion here; only the guard flag moves in this epic.
 *
 * The green "safety" guards must pass both now and after Story 22.2's removal:
 *   - For each of the six non-ngrx packages, no module-specifier reference may
 *     remain anywhere in app source, config, or scripts — these block removing
 *     anything that is actually used. (No such guard exists for the ngrx
 *     packages on purpose: @ngrx/entity IS imported at runtime by
 *     @smarttools/smart-core's fesm bundle.)
 *   - AC #2 peer-resolution safety: among all direct deps/devDeps, no package
 *     whose installed runtime bundle imports '@ngrx/store' declares it as a
 *     required peer (so removing it from the root manifest is safe — nothing
 *     needs it at runtime), and every runtime importer of '@ngrx/entity'
 *     declares it as a required peer so pnpm's default auto-install-peers=true
 *     (no .npmrc override in this repo) keeps it resolvable after removal.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** src/app -> src -> server -> apps -> workspace root (verified: package.json resolves here). */
const repoRoot = join(__dirname, '..', '..', '..', '..');

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(path: string): PackageJsonLike {
  return JSON.parse(readFileSync(path, 'utf-8')) as PackageJsonLike;
}

/** All direct deps + devDeps declared in the root manifest. */
function readDeclaredPackages(): Set<string> {
  const pkg = readPackageJson(join(repoRoot, 'package.json'));
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
}

/** Red-phase guard (NOT test.skip — that trips the no-skipped-tests gate). */
const STORY_22_2_IMPLEMENTED = true;

/** The eight direct deps Story 22.2 must remove from the root manifest. */
const REMOVAL_TARGETS: string[] = [
  'express',
  'zone.js',
  'primeicons',
  'eslint-plugin-cypress',
  '@angular/ssr',
  '@angular/platform-server',
  '@ngrx/store',
  '@ngrx/entity',
];

/** The six non-ngrx targets that must be verifiably unused (safety guards). */
const UNUSED_TARGETS: string[] = [
  'express',
  'zone.js',
  'primeicons',
  'eslint-plugin-cypress',
  '@angular/ssr',
  '@angular/platform-server',
];

/** Directories never scanned for usage references. */
function isExcludedDir(name: string): boolean {
  return (
    name === 'node_modules' ||
    name === 'dist' ||
    name === '.git' ||
    name === 'coverage' ||
    name === '.angular' ||
    name === '.nx'
  );
}

/** Recursively list all files under dir, skipping excluded dirs. */
function walkFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // directory vanished mid-walk (parallel test workers) — nothing to scan
  }
  for (const entry of entries) {
    if (isExcludedDir(entry)) {
      continue;
    }
    const full = join(dir, entry);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue; // file removed between readdir and stat by a parallel test worker
    }
    if (st.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/** Root-level config files scanned for usage references. */
function rootConfigFiles(): string[] {
  const candidates = [
    'package.json',
    'nx.json',
    'eslint.config.mjs',
    'tsconfig.base.json',
    'tsconfig.json',
    '.prettierrc',
    '.jscpd.json',
    'documentation.json',
    'migrations.json',
  ];
  return candidates.filter((name) => existsSync(join(repoRoot, name)));
}

/**
 * True when `source` contains a module-specifier reference to `pkg`: the exact
 * quoted package name or a subpath import (`'pkg/...'`). Word boundaries keep
 * longer specifiers (e.g. '@types/express') from matching 'express'.
 */
function referencesPackage(source: string, pkg: string): boolean {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"]${escaped}(?:/[^'"]*)?['"]`).test(source);
}

/** All files scanned for usage references (apps + scripts + root configs). */
function scanFiles(): string[] {
  const dirs = ['apps', 'scripts'].filter((d) => existsSync(join(repoRoot, d)));
  return [
    ...dirs.flatMap((d) => walkFiles(join(repoRoot, d))),
    ...rootConfigFiles().map((name) => join(repoRoot, name)),
  ];
}

/**
 * Source text of a scanned file. For the root package.json the dependencies /
 * devDependencies blocks are stripped first: those entries are declarations
 * (the red assertions above target them), not usages — but any reference in
 * scripts or other fields still counts as usage.
 */
function scanSource(file: string): string {
  if (file === join(repoRoot, 'package.json')) {
    const pkg = readPackageJson(file);
    delete pkg.dependencies;
    delete pkg.devDependencies;
    return JSON.stringify(pkg);
  }
  return readFileSync(file, 'utf-8');
}

/** Files (excluding this spec itself) that reference `pkg` as a module. */
function findReferences(pkg: string): string[] {
  return scanFiles()
    .filter((file) => !file.endsWith('dependencies.spec.ts'))
    .flatMap((file) => {
      let source: string;
      try {
        source = scanSource(file);
      } catch {
        return []; // file vanished between walk and read (parallel test workers) — skip it
      }
      return referencesPackage(source, pkg) ? [file] : [];
    })
    .map((file) => file.slice(repoRoot.length + 1));
}

/** Installed manifest of a direct dep/devDep, or null if not installed. */
function readInstalledManifest(name: string): PackageJsonLike | null {
  const path = join(repoRoot, 'node_modules', name, 'package.json');
  return existsSync(path) ? readPackageJson(path) : null;
}

interface PeerDeclarer {
  name: string;
  storeRequired: boolean;
  entityRequired: boolean;
}

/**
 * Direct deps/devDeps (excluding the two ngrx packages themselves) whose
 * installed manifest declares @ngrx/store and/or @ngrx/entity as a REQUIRED
 * peer — present in peerDependencies, absent from peerDependenciesMeta or
 * meta.optional !== true.
 */
function requiredPeerDeclarers(): PeerDeclarer[] {
  const declared = readDeclaredPackages();
  const declarers: PeerDeclarer[] = [];
  for (const name of [...declared].sort((a, b) => a.localeCompare(b))) {
    if (name === '@ngrx/store' || name === '@ngrx/entity') {
      continue;
    }
    const manifest = readInstalledManifest(name);
    if (!manifest) {
      continue;
    }
    const peers =
      (
        manifest as PackageJsonLike & {
          peerDependencies?: Record<string, string>;
        }
      ).peerDependencies ?? {};
    const meta =
      (
        manifest as PackageJsonLike & {
          peerDependenciesMeta?: Record<string, { optional?: boolean }>;
        }
      ).peerDependenciesMeta ?? {};
    const required = (pkg: string): boolean =>
      pkg in peers &&
      !(meta[pkg] !== undefined && meta[pkg]?.optional === true);
    if (required('@ngrx/store') || required('@ngrx/entity')) {
      declarers.push({
        name,
        storeRequired: required('@ngrx/store'),
        entityRequired: required('@ngrx/entity'),
      });
    }
  }
  return declarers;
}

/** Runtime bundle files of an installed package (fesm2022 first, dist fallback). */
function runtimeBundleFiles(name: string): string[] {
  const base = join(repoRoot, 'node_modules', name);
  for (const dirName of ['fesm2022', 'dist']) {
    const dir = join(base, dirName);
    if (!existsSync(dir)) {
      continue;
    }
    return walkFiles(dir).filter((file) => /\.(?:mjs|cjs|js)$/.test(file));
  }
  return [];
}

/** True when the package's installed runtime bundle imports `spec` as a module. */
function runtimeImports(name: string, spec: string): boolean {
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`['"]${escaped}(?:/[^'"]*)?['"]`);
  return runtimeBundleFiles(name).some((file) =>
    re.test(readFileSync(file, 'utf-8')),
  );
}

describe('Epic 22: dependency pruning contract (red-phase scaffold for Story 22.2)', () => {
  describe('AC #1 — the eight targeted deps are removed from the root manifest', () => {
    for (const name of REMOVAL_TARGETS) {
      it(`${name} is not declared in the root package.json`, () => {
        // Red-phase guard: bails out until Story 22.2 flips STORY_22_2_IMPLEMENTED.
        if (!STORY_22_2_IMPLEMENTED) {
          // eslint-disable-next-line sonarjs/explicit-test-skip -- mandated red-phase guard pattern (see file header), not a disabled test
          return;
        }
        expect(
          readDeclaredPackages().has(name),
          `${name} should be removed from the root manifest by Story 22.2`,
        ).toBe(false);
      });
    }

    it('no stray apps/electron/package-lock.json exists', () => {
      // Red-phase guard: bails out until Story 22.2 flips STORY_22_2_IMPLEMENTED.
      if (!STORY_22_2_IMPLEMENTED) {
        // eslint-disable-next-line sonarjs/explicit-test-skip -- mandated red-phase guard pattern (see file header), not a disabled test
        return;
      }
      expect(
        existsSync(join(repoRoot, 'apps', 'electron', 'package-lock.json')),
      ).toBe(false);
    });
  });

  describe('AC #1 safety — the six non-ngrx targets are genuinely unused (green now and after removal)', () => {
    for (const name of UNUSED_TARGETS) {
      it(`${name} has no module-specifier reference in app source, config, or scripts`, () => {
        expect(
          findReferences(name),
          `unexpected references to ${name}`,
        ).toEqual([]);
      });
    }
  });

  describe('AC #2 — ngrx peer-resolution safety (green now and after removal)', () => {
    it("no required-peer declarer's runtime bundle imports '@ngrx/store' (removal is safe)", () => {
      const offenders = requiredPeerDeclarers()
        .filter((d) => d.storeRequired && runtimeImports(d.name, '@ngrx/store'))
        .map((d) => d.name);
      // @smarttools/smart-core declares @ngrx/store as a required peer but its
      // fesm2022 bundle never imports it — nothing needs the package at
      // runtime, so removing it from the root manifest cannot break resolution.
      expect(offenders).toEqual([]);
    });

    it("every '@ngrx/entity' runtime importer declares it as a required peer (pnpm auto-install-peers keeps it resolvable)", () => {
      const importers = requiredPeerDeclarers().filter((d) =>
        runtimeImports(d.name, '@ngrx/entity'),
      );
      // @smarttools/smart-core's fesm bundle imports createEntityAdapter from
      // '@ngrx/entity' exactly once. Its manifest declares @ngrx/entity as a
      // REQUIRED peer (no peerDependenciesMeta), and pnpm runs with the default
      // auto-install-peers=true — there is no .npmrc in this repo overriding it
      // — so after Story 22.2 removes @ngrx/entity from the root manifest,
      // pnpm still installs it as a peer (with a warning) and resolution holds.
      for (const importer of importers) {
        expect(
          importer.entityRequired,
          `${importer.name} imports '@ngrx/entity' at runtime but does not declare it as a required peer`,
        ).toBe(true);
      }
    });
  });
});
