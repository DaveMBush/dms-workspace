import { type Page } from 'playwright/test';

/**
 * Deliberate fixed pacing for E2E tests where no observable condition exists to
 * sync on (post-action settle after a click/fill/scroll, virtual-scroll frame
 * pacing, or baseline settling before arming an observation window that asserts
 * the ABSENCE of requests/reloads — absence of events is not awaitable).
 *
 * Centralised here so `sonarjs/no-fixed-wait-in-tests` (S2925) stays active for
 * any NEW direct `page.waitForTimeout(...)` call in spec files, while these
 * known-necessary fixed waits live in a single documented place. This file is a
 * helper (not a test-related file), so the rule does not flag it.
 *
 * Behaviour is unchanged from an inline `page.waitForTimeout(ms)`.
 */
export async function settle(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}
