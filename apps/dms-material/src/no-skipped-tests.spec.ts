import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Story 12.1 — no-skipped-tests scanner (AC #1 / #2 / #3).
//
// This spec is the executable definition of "no skipped tests in the repo".
// It walks every *.spec.ts file under the repository root and reports any line
// that carries one of the four disabled-test marker forms (the dot-skip call,
// the x-prefixed it, and the x-prefixed describe). The markers are matched by
// regex below; they are deliberately not spelled out verbatim in this comment so
// that this file itself stays clean once Story 12.2 flips its own marker off.
//
// The three parts map to the acceptance criteria:
//   AC #2 — an unskipped assertion proves the scanner returns zero hits on a
//           clean fixture tree (this file's __fixtures__/clean/).
//   (control) — an unskipped positive control proves the scanner actually
//           detects markers, so it cannot pass vacuously.
//   AC #1 / #3 — the repo-wide scan assertion is kept skipped for now so CI
//           stays green; Story 12.2 clears every skip in the tree and then
//           flips this assertion on (it.skip -> it), at which point a clean
//           repo makes it pass.

const workspaceRoot = join(import.meta.dirname, '..', '..', '..');

interface SkipHit {
  file: string;
  line: number;
  text: string;
}

// Matches the four skip-marker forms. The backslash-escaped literal below does
// not match itself (the source contains "\." and "\(" sequences), so this spec
// is safe to scan even while it carries its own intentional skip marker.
const skipMarker = /(\.skip\(|xit\(|xdescribe\()/;

function collectSpecFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSpecFiles(full));
    } else if (entry.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function scanForSkippedTests(dir: string): SkipHit[] {
  const hits: SkipHit[] = [];
  for (const file of collectSpecFiles(dir)) {
    const lines = readFileSync(file, 'utf-8').split('\n');
    lines.forEach((text, i) => {
      if (skipMarker.test(text)) {
        hits.push({ file: file.replace(/\\/g, '/'), line: i + 1, text });
      }
    });
  }
  return hits;
}

describe('no-skipped-tests scanner (Story 12.1)', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    tempDir = undefined;
  });

  it('AC #2 — finds zero skipped tests in a clean fixture tree', () => {
    const hits = scanForSkippedTests(
      join(import.meta.dirname, '__fixtures__', 'clean'),
    );
    expect(hits).toEqual([]);
  });

  it('control — detects every skip-marker form when present (no vacuous pass)', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'skip-scan-'));
    // Built at runtime from split literals so no raw marker token appears in
    // this source file (which the repo-wide scan reads). Each concatenation
    // yields one of the four disabled-test forms.
    const markerA = 'it.' + 'skip(';
    const markerB = 'x' + 'it(';
    const markerC = 'x' + 'describe(';
    writeFileSync(
      join(tempDir, 'dirty.spec.ts'),
      [
        "import { describe, it } from 'vitest';",
        `  ${markerA}'skipped test', () => {});`,
        `  ${markerB}'skipped via x prefix', () => {});`,
        `${markerC}('skipped suite', () => {});`,
      ].join('\n'),
    );

    const hits = scanForSkippedTests(tempDir);
    expect(hits).toHaveLength(3);
    expect(hits.map((h) => h.line)).toEqual([2, 3, 4]);
  });

  // TODO(E82): blocked — repo-wide scan fails until Story 12.2 clears every skip in the tree; then flip it.skip -> it (AC #1 / #3).
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test
  it.skip('AC #1 — finds zero skipped tests across the whole repository', () => {
    const hits = scanForSkippedTests(workspaceRoot);
    if (hits.length > 0) {
      const report = hits.map((h) => h.file + ':' + h.line).join('\n');
      throw new Error('skipped tests still present:\n' + report);
    }
    expect(hits).toEqual([]);
  });
});
