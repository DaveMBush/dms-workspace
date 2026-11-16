// Story 20.1: red-phase contract tests for a single shared `--dms-*` token source.
// AC #1 — Tailwind's `theme.extend` must resolve from the same `--dms-*` custom
//         properties defined in the theme SCSS, not from a parallel hardcoded set.
// They were skipped during Story 20.1 (red phase); Story 20.2 Task 1 unskips
// them to confirm red, then wires the tokens until green.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appDir = join(import.meta.dirname, '..');
const stylesScssPath = join(import.meta.dirname, 'styles.scss');
const componentTreeRoot = join(import.meta.dirname, 'app');
const tailwindConfigPath = join(appDir, 'tailwind.config.js');
const themeVariablesScssPath = join(
  import.meta.dirname,
  'themes',
  '_theme-variables.scss',
);

function isQuoteChar(ch: string): boolean {
  return ch === "'" || ch === '"' || ch === '`';
}

/** Advance one char of an open string, clearing `state.quote` when it closes. */
function stepStringState(ch: string, state: { quote: string | null }): void {
  if (ch === '\\') {
    return; // escaped char — stay inside the string
  }
  if (ch === state.quote) {
    state.quote = null;
  }
}

/**
 * Extract the raw source text of the `extend: { ... }` object inside
 * tailwind.config.js. Brace-matched (string-aware) so it stays correct once
 * Story 20.2 fills the block with nested value objects.
 */
function extractExtendBlock(source: string): string {
  const openBrace = source.indexOf('{', source.indexOf('extend'));
  let depth = 0;
  const state: { quote: string | null } = { quote: null };
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (state.quote !== null) {
      stepStringState(ch, state);
      continue;
    }
    if (isQuoteChar(ch)) {
      state.quote = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}' && --depth === 0) {
      return source.slice(openBrace + 1, i);
    }
  }
  throw new Error('unbalanced braces in tailwind.config.js theme.extend');
}

/** Collect the hex values assigned to `--dms-*` custom properties in the SCSS. */
function collectDmsTokenHexes(scss: string): string[] {
  const re = /--dms-[a-z0-9-]+\s*:\s*(#[0-9a-fA-F]{3,8})\b/g;
  const hexes = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(scss)) !== null) {
    hexes.add(match[1].toLowerCase());
  }
  return [...hexes];
}

/** Recursively collect every .ts/.html file under dir (components + templates). */
function listComponentFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listComponentFiles(full));
    } else if (/\.tsx?$|\.html$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/** Strip full-line SCSS comments so class tokens inside them are not counted. */
function stripScssComments(source: string): string {
  return source
    .split('\n')
    .map((line) => (line.trimStart().startsWith('//') ? '' : line))
    .join('\n');
}

/**
 * Extract every app-defined class name used in a selector of the SCSS.
 * Framework classes (Material/CDK) are excluded: anything starting with
 * `mdc-` or `mat-mdc-`.
 */
function extractCustomUtilityClasses(scss: string): string[] {
  const names = new Set<string>();
  const re = /\.([a-zA-Z][\w-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stripScssComments(scss))) !== null) {
    const name = match[1];
    if (name.startsWith('mdc-') || name.startsWith('mat-mdc-')) {
      continue;
    }
    names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** True when the class token appears as a standalone reference in any file. */
function isClassReferenced(className: string, files: string[]): boolean {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Lookarounds keep `--dms-text-primary`-style custom-property usages from
  // counting as a reference to the `.text-primary` class.
  const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
  return files.some((file) => re.test(readFileSync(file, 'utf-8')));
}

/** Classes defined in styles.scss that no component or template references. */
function findDeadUtilityClasses(): string[] {
  const scss = readFileSync(stylesScssPath, 'utf-8');
  const files = listComponentFiles(componentTreeRoot);
  return extractCustomUtilityClasses(scss).filter(
    (name) => !isClassReferenced(name, files),
  );
}

describe('Story 20.1 — shared --dms-* token source', () => {
  describe('Tailwind theme.extend (AC #1)', () => {
    it('references the --dms-* custom properties and does not duplicate hardcoded SCSS values', () => {
      const configSource = readFileSync(tailwindConfigPath, 'utf-8');
      const extendBlock = extractExtendBlock(configSource);

      // Tailwind utilities must resolve from the shared token source.
      expect(extendBlock).toMatch(/var\(\s*--dms-[a-z0-9-]+/);

      // ...and not from a parallel hardcoded palette copied out of the SCSS.
      const scss = readFileSync(themeVariablesScssPath, 'utf-8');
      const duplicatedHexes = collectDmsTokenHexes(scss).filter((hex) =>
        extendBlock.toLowerCase().includes(hex),
      );
      expect(duplicatedHexes).toEqual([]);
    });
  });

  describe('dead custom utility classes in styles.scss (AC #2)', () => {
    it('every custom utility class defined in styles.scss is referenced by at least one component or template', () => {
      const deadClasses = findDeadUtilityClasses();
      expect(deadClasses).toEqual([]);
    });
  });
});
