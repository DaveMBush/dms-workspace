import path from 'path';
import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Story 59-1: Failing E2E test – filename visibility in dark mode
 *
 * Root cause (to be fixed in Story 59-2):
 *   apps/dms-material/src/app/global/import-dialog/import-dialog.component.scss
 *
 *   .selected-file-name {
 *     color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
 *   }
 *
 * When Angular Material's CSS layer does not expose --mat-sys-on-surface-variant
 * in the dialog portal context, the fallback rgba(0,0,0,0.6) (near-black) is
 * rendered on the dark dialog surface (#424242), producing a contrast ratio of
 * roughly 1.7:1 — far below the WCAG AA minimum of 4.5:1 for normal text.
 *
 * This test FAILS on the current code and PASSES after the Story 59-2 fix.
 */

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/** Parse an rgb/rgba string from getComputedStyle into [r, g, b, a] 0–255 / 0–1. */
function parseRgba(raw: string): [number, number, number, number] {
  const m = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) throw new Error(`Cannot parse colour: ${raw}`);
  return [
    parseInt(m[1], 10),
    parseInt(m[2], 10),
    parseInt(m[3], 10),
    m[4] !== undefined ? parseFloat(m[4]) : 1,
  ];
}

/**
 * Alpha-composite a foreground RGBA colour over an opaque RGB background.
 * Returns the opaque composited [r, g, b].
 */
function composite(
  fg: [number, number, number, number],
  bg: [number, number, number, number]
): [number, number, number] {
  const [fr, fg2, fb, fa] = fg;
  const [br, bg2, bb] = bg;
  return [
    Math.round(fr * fa + br * (1 - fa)),
    Math.round(fg2 * fa + bg2 * (1 - fa)),
    Math.round(fb * fa + bb * (1 - fa)),
  ];
}

/** WCAG 2.1 relative luminance (IEC 61966-2-1 gamma). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio between two opaque colours. */
function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number]
): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Import dialog filename visibility in dark mode', () => {
  test('selected filename text must meet WCAG AA contrast (4.5:1) against the dialog surface in dark mode', async ({
    page,
  }) => {
    // ── 1. Force dark theme before the app boots ─────────────────────────
    // Use addInitScript so the localStorage entry is written before any app
    // script runs, eliminating the goto-then-evaluate race condition.
    await page.addInitScript(() => localStorage.setItem('dms-theme', 'dark'));

    // ── 2. Login ──────────────────────────────────────────────────────────
    await login(page);

    // Confirm dark-theme class was applied
    await expect(page.locator('body')).toHaveClass(/dark-theme/, {
      timeout: 10000,
    });

    // ── 3. Navigate to the universe page ─────────────────────────────────
    await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });

    const importButton = page.locator(
      '[data-testid="import-transactions-button"]'
    );
    await expect(importButton).toBeVisible({ timeout: 15000 });

    // ── 4. Open the import dialog ─────────────────────────────────────────
    await importButton.click();
    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).toBeVisible({ timeout: 10000 });

    // ── 5. Select a CSV file to trigger the filename display ──────────────
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, 'fidelity-valid.csv')
    );

    const fileNameSpan = page.locator('span.selected-file-name');
    await expect(fileNameSpan).toBeVisible({ timeout: 5000 });

    // ── 6. Capture computed colours ───────────────────────────────────────
    const { textColorRaw, bgColorRaw, cssVar } = await page.evaluate(() => {
      const span = document.querySelector('span.selected-file-name');
      const surface = document.querySelector('.mat-mdc-dialog-surface');
      if (!span || !surface) throw new Error('Required elements not found');

      const spanStyle = window.getComputedStyle(span);
      const surfaceStyle = window.getComputedStyle(surface);

      return {
        textColorRaw: spanStyle.getPropertyValue('color').trim(),
        bgColorRaw: surfaceStyle.getPropertyValue('background-color').trim(),
        cssVar: spanStyle
          .getPropertyValue('--mat-sys-on-surface-variant')
          .trim(),
      };
    });

    const textRgba = parseRgba(textColorRaw);
    const bgRgba = parseRgba(bgColorRaw);

    // Alpha-composite the foreground text colour over the dialog background
    // before computing luminance/contrast.  This correctly handles the
    // rgba(0,0,0,0.6) fallback that is the root cause of the bug.
    const compositedText = composite(textRgba, bgRgba);
    const compositedBg: [number, number, number] = [
      bgRgba[0],
      bgRgba[1],
      bgRgba[2],
    ];
    const ratio = contrastRatio(compositedText, compositedBg);

    // Diagnostic output — visible in Playwright traces / CI logs
    console.log('Dark mode filename colour inspection:');
    console.log(`  --mat-sys-on-surface-variant  : "${cssVar}"`);
    console.log(`  computed text color (raw)     : ${textColorRaw}`);
    console.log(
      `  composited text color (rgb)   : rgb(${compositedText.join(', ')})`
    );
    console.log(`  dialog surface background     : ${bgColorRaw}`);
    console.log(`  contrast ratio                : ${ratio.toFixed(2)}:1`);

    // ── 7. Assert WCAG AA contrast ────────────────────────────────────────
    // This assertion FAILS on the current code because .selected-file-name
    // falls back to rgba(0,0,0,0.6) (near-black) when the
    // --mat-sys-on-surface-variant CSS custom property is not available in
    // the dialog portal, producing ~1.7:1 contrast on the #424242 surface.
    //
    // After the Story 59-2 fix (color: inherit / var(--mat-sys-on-surface))
    // the text inherits a light colour from the dark theme and this passes.
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
