/* eslint-disable vitest/no-disabled-tests -- Story 25.1 red-phase contract tests; unskipped by Story 25.2 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// TDD RED Phase: Story 25.1 - column spread (flex-grow) in dms-base-table.
// These tests define the contract that Story 25.2 must satisfy when it changes
// `.dms-header-cell` and `.dms-body-cell` from `flex: 0 1 auto` to
// `flex: 1 1 auto` so columns spread over the full row width while configured
// widths still render as their flex-basis. They are intentionally red against
// the current SCSS; each test is marked it.skip so CI stays green until Story
// 25.2 unskips, confirms red, then implements. No production code changes in
// this story.

// The component's declared styles. This test environment does not inject
// component SCSS into the DOM (computed styles resolve empty on a rendered
// cell), so these tests assert the source rule rather than getComputedStyle —
// matching base-table-numeric-alignment.spec.ts and the Story 5.x convention
// for a genuine red→green signal.
const scss = readFileSync(
  path.join(__dirname, 'base-table.component.scss'),
  'utf-8',
);

describe('BaseTableComponent - column spread (flex-grow)', () => {
  // Extract the top-level `.dms-header-cell` rule body. Match only the
  // column-0 line so a nested/indented recurrence (e.g. inside .dark-theme)
  // does not shadow the shared block; walk braces to capture the full body,
  // mirroring numericCellRuleBody() in base-table-numeric-alignment.spec.ts.
  function headerCellRuleBody(): string {
    const lines = scss.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '.dms-header-cell {') {
        start = i;
        break;
      }
    }
    expect(
      start,
      'expected a .dms-header-cell rule in base-table.component.scss',
    ).toBeGreaterThan(-1);
    let depth = 1;
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].includes('{')) {
        depth++;
      }
      if (lines[i].includes('}')) {
        depth--;
      }
      if (depth === 0) {
        return lines.slice(start + 1, i).join('\n');
      }
    }
    throw new Error('.dms-header-cell block not closed in SCSS');
  }

  // Extract the top-level `.dms-body-cell` rule body. Same column-0 match +
  // brace walk as headerCellRuleBody() so a nested/indented recurrence cannot
  // shadow the shared block.
  function bodyCellRuleBody(): string {
    const lines = scss.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '.dms-body-cell {') {
        start = i;
        break;
      }
    }
    expect(
      start,
      'expected a .dms-body-cell rule in base-table.component.scss',
    ).toBeGreaterThan(-1);
    let depth = 1;
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].includes('{')) {
        depth++;
      }
      if (lines[i].includes('}')) {
        depth--;
      }
      if (depth === 0) {
        return lines.slice(start + 1, i).join('\n');
      }
    }
    throw new Error('.dms-body-cell block not closed in SCSS');
  }

  // Task 1.2 (AC #1) - the top-level header cell rule declares a flex shorthand
  // with grow = 1 and basis `auto` so columns spread to fill the row width while
  // configured widths render as their flex-basis. Red against the current SCSS,
  // which still says `flex: 0 1 auto`.
  it.skip('should declare flex: 1 1 auto on .dms-header-cell', () => {
    const body = headerCellRuleBody();
    expect(/flex:\s*1\s+1\s+auto/.test(body)).toBe(true);
  });

  // Task 2.1 (AC #2) - the top-level body cell rule declares a flex shorthand
  // with grow = 1 and basis `auto` so columns spread to fill the row width while
  // configured widths render as their flex-basis. Red against the current SCSS,
  // which still says `flex: 0 1 auto`.
  it.skip('should declare flex: 1 1 auto on .dms-body-cell', () => {
    const body = bodyCellRuleBody();
    expect(/flex:\s*1\s+1\s+auto/.test(body)).toBe(true);
  });
});
