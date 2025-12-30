const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  await page.goto('http://localhost:4201/auth/login');
  await page.fill('input[type="email"]', 'dev@dms.local');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:4201/account/test');
  await page.waitForTimeout(2000);

  const metrics = await page.evaluate(() => {
    const summary = document.querySelector('dms-summary');
    const tabPanel = document.querySelector('mat-tab-nav-panel');
    const outerDiv = summary?.querySelector('.flex');

    return {
      viewport: window.innerHeight,
      tabPanelHeight: tabPanel?.offsetHeight,
      summaryHeight: summary?.offsetHeight,
      outerDivHeight: outerDiv?.offsetHeight,
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: '/tmp/dms-ui.png' });
  console.log('Screenshot saved');

  await browser.close();
})();
