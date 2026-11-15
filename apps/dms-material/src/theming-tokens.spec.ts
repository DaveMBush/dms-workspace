/* eslint-disable vitest/no-disabled-tests -- red-phase (Story 20.1) contract tests; intentionally skipped until the token wiring lands */

// Story 20.1: red-phase contract tests for a single shared `--dms-*` token source.
// AC #1 — Tailwind's `theme.extend` must resolve from the same `--dms-*` custom
//         properties defined in the theme SCSS, not from a parallel hardcoded set.
// These assertions are marked it.skip so the suite stays green BEFORE Story 20.2
// wires the tokens; Story 20.2's first task removes the skip markers, confirms
// they FAIL against current code, then implements until green.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appDir = join(import.meta.dirname, '..');
const tailwindConfigPath = join(appDir, 'tailwind.config.js');
const themeVariablesScssPath = join(
  import.meta.dirname,
  'themes',
  '_theme-variables.scss',
);

/**
 * Extract the raw source text of the `extend: { ... }` object inside
 * tailwind.config.js. Brace-matched (string-aware) so it stays correct once
 * Story 20.2 fills the block with nested value objects.
 */
function extractExtendBlock(source: string): string {
  const anchor = source.indexOf('extend');
  expect(anchor).toBeGreaterThanOrEqual(0);
  const openBrace = source.indexOf('{', anchor);
  expect(openBrace).toBeGreaterThan(anchor);

  let depth = 0;
  let inString: string | null = null;
  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') {
        i++;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(openBrace + 1, i);
      }
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

describe('Story 20.1 — shared --dms-* token source', () => {
  describe('Tailwind theme.extend (AC #1)', () => {
    it.skip('references the --dms-* custom properties and does not duplicate hardcoded SCSS values', () => {
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

  // Task 2 (AC #2): dead custom utility class assertions for styles.scss land here.
});
