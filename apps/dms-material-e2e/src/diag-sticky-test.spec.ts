import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const HEADER_ROW_SELECTOR = 'tr.mat-mdc-header-row';

test.describe('DIAGNOSTIC - sticky CSS after account change', () => {
  let universeCleanup: () => Promise<void>;
  let openPositionsCleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const universeSeeder = await seedScrollUniverseData();
    universeCleanup = universeSeeder.cleanup;
    const openPositionsSeeder = await seedScrollOpenPositionsData();
    openPositionsCleanup = openPositionsSeeder.cleanup;
  });

  test.afterAll(async () => {
    if (universeCleanup) {
      await universeCleanup();
    }
    if (openPositionsCleanup) {
      await openPositionsCleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
  });

  test('DIAG: capture CSS chain after account change', async ({ page }) => {
    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();

    // Reset scrollTop
    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 0;
    });

    // Capture baseline CSS
    const beforeCss = await page.evaluate(() => {
      const th = document.querySelector('th.mat-mdc-header-cell');
      if (!th) {
        return 'NO TH FOUND';
      }
      const ancestors: {tag: string; class: string; position: string; overflow: string; overflowY: string; transform: string; contain: string; willChange: string}[] = [];
      let el: Element | null = th;
      while (el) {
        const s = window.getComputedStyle(el);
        ancestors.push({
          tag: el.tagName,
          class: el.className.toString().substring(0, 50),
          position: s.position,
          overflow: s.overflow,
          overflowY: s.overflowY,
          transform: s.transform !== 'none' ? s.transform.substring(0, 60) : 'none',
          contain: s.contain || 'none',
          willChange: s.willChange || 'auto'
        });
        el = el.parentElement;
      }
      return JSON.stringify(ancestors, null, 2);
    });
    console.log('=== BEFORE ACCOUNT CHANGE ===');
    console.log(beforeCss);

    // Baseline: capture tr and th y at scrollTop=4 BEFORE account change
    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 4;
    });
    await page.waitForTimeout(16);
    const baselineDetail = await page.evaluate(() => {
      const tr = document.querySelector('tr.mat-mdc-header-row')!;
      const th = document.querySelector('th.mat-mdc-header-cell')!;
      return {
        trY: tr?.getBoundingClientRect().y,
        thY: th?.getBoundingClientRect().y,
      };
    });
    console.log('=== BASELINE scrollTop=4: tr.y=' + baselineDetail.trY + ' th.y=' + baselineDetail.thY);
    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 0;
    });

    // Account change
    const accountSelect = page.locator('.account-select mat-select');
    await accountSelect.click();
    await page.locator('mat-option').nth(1).click();
    await page.waitForTimeout(500);
    await expect(page.locator('tr.mat-mdc-row').first()).toBeVisible({ timeout: 10000 });

    // Scroll 4px
    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 4;
    });
    await page.waitForTimeout(16);

    // After account change: capture BOTH tr and th at scrollTop=4 immediately
    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 4;
    });
    await page.waitForTimeout(16);
    const afterDetail4 = await page.evaluate(() => {
      const tr = document.querySelector('tr.mat-mdc-header-row')!;
      const th = document.querySelector('th.mat-mdc-header-cell')!;
      return {
        trY: tr?.getBoundingClientRect().y,
        thY: th?.getBoundingClientRect().y,
      };
    });
    console.log('=== AFTER ACCOUNT CHANGE scrollTop=4: tr.y=' + afterDetail4.trY + ' th.y=' + afterDetail4.thY);

    // Wait 300ms and check again
    await page.waitForTimeout(300);
    const afterDetail4b = await page.evaluate(() => {
      const tr = document.querySelector('tr.mat-mdc-header-row')!;
      const th = document.querySelector('th.mat-mdc-header-cell')!;
      return {
        trY: tr?.getBoundingClientRect().y,
        thY: th?.getBoundingClientRect().y,
      };
    });
    console.log('=== AFTER 300ms: tr.y=' + afterDetail4b.trY + ' th.y=' + afterDetail4b.thY);

    await viewport.evaluate((el: Element) => {
      (el as HTMLElement).scrollTop = 4;
    });
    await page.waitForTimeout(16);
    const detailAfter = await page.evaluate(() => {
      const th = document.querySelector<HTMLElement>('th.mat-mdc-header-cell')!;
      const wrapper = document.querySelector<HTMLElement>('.cdk-virtual-scroll-content-wrapper')!;
      const vp = document.querySelector<HTMLElement>('cdk-virtual-scroll-viewport')!;
      const spacer = document.querySelector<HTMLElement>('.cdk-virtual-scroll-spacer')!;
      const tableContainer = document.querySelector<HTMLElement>('.table-container')!;
      const thStyle = window.getComputedStyle(th);
      return {
        thRect: th.getBoundingClientRect(),
        thOffsetTop: th.offsetTop,
        thOffsetParentTag: (th.offsetParent as HTMLElement).tagName,
        wrapperRect: wrapper.getBoundingClientRect(),
        wrapperOffsetTop: wrapper.offsetTop,
        wrapperOffsetHeight: wrapper.offsetHeight,
        vpRect: vp.getBoundingClientRect(),
        vpScrollTop: vp.scrollTop,
        vpScrollHeight: vp.scrollHeight,
        vpClientHeight: vp.clientHeight,
        spacerH: spacer.style.height,
        tableContainerRect: tableContainer.getBoundingClientRect(),
        stickyStyle: thStyle.position,
        stickyTop: thStyle.top,
        thHeight: th.offsetHeight,
      };
    });
    console.log('=== DETAIL AFTER ACCOUNT CHANGE (scrollTop=4) ===');
    console.log(JSON.stringify(detailAfter, null, 2));

    // Also check baseline at scrollTop=4 (before account change by scrolling first)


    // Capture CSS after account change
    const afterCss = await page.evaluate(() => {
      const th = document.querySelector('th.mat-mdc-header-cell');
      if (!th) {
        return 'NO TH FOUND';
      }
      const ancestors: {tag: string; class: string; position: string; overflow: string; overflowY: string; transform: string; contain: string; willChange: string}[] = [];
      let el: Element | null = th;
      while (el) {
        const s = window.getComputedStyle(el);
        ancestors.push({
          tag: el.tagName,
          class: el.className.toString().substring(0, 50),
          position: s.position,
          overflow: s.overflow,
          overflowY: s.overflowY,
          transform: s.transform !== 'none' ? s.transform.substring(0, 60) : 'none',
          contain: s.contain || 'none',
          willChange: s.willChange || 'auto'
        });
        el = el.parentElement;
      }
      return JSON.stringify(ancestors, null, 2);
    });
    console.log('=== AFTER ACCOUNT CHANGE (scrollTop=4) ===');
    console.log(afterCss);

    // Capture positions
    const [hb, vb, st] = await Promise.all([
      header.boundingBox(),
      viewport.boundingBox(),
      viewport.evaluate((el: Element) => (el as HTMLElement).scrollTop),
    ]);
    console.log(`headerTop=${hb?.y}, viewportTop=${vb?.y}, scrollTop=${st}`);
    console.log(`Expected headerTop >= viewportTop (sticky works). Got: ${hb?.y} vs ${vb?.y}`);

    expect(true).toBe(true);
  });
});
