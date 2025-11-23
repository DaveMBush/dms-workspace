# Story AG.4: Performance Validation

## Story

**As a** user with large datasets
**I want** the application to perform well
**So that** I can work efficiently without lag or delays

## Context

The primary driver for this migration is improved virtual scrolling with lazy loading performance. This story validates that the migration achieved its goals.

## Acceptance Criteria

### Functional Requirements

- [ ] Virtual scrolling smooth with 1000+ rows
- [ ] Lazy loading triggers correctly
- [ ] Initial page load < 3 seconds
- [ ] Interaction response < 100ms

### Technical Requirements

- [ ] Bundle size comparable to RMS
- [ ] No memory leaks detected
- [ ] Efficient change detection

### Performance Benchmarks

| Metric                   | Target    | Method     |
| ------------------------ | --------- | ---------- |
| Initial Load (FCP)       | < 1.5s    | Lighthouse |
| Time to Interactive      | < 3.0s    | Lighthouse |
| Scroll FPS (1000 rows)   | >= 55fps  | DevTools   |
| Lazy Load Trigger        | < 200ms   | Custom     |
| Memory (after 10min use) | No growth | DevTools   |

## Technical Approach

### Step 1: Bundle Size Analysis

```bash
# Build production bundles
pnpm nx run rms:build:production
pnpm nx run rms-material:build:production

# Compare sizes
ls -la dist/apps/rms/browser/*.js
ls -la dist/apps/rms-material/browser/*.js
```

**Target:** rms-material bundle within 10% of rms bundle.

### Step 2: Lighthouse Audit

Run Lighthouse on key pages:

- Login page
- Dashboard (with data)
- Dividend deposits (with 1000+ records)

```bash
# Using Lighthouse CLI
lighthouse http://localhost:4201 --output html --output-path ./lighthouse-report.html
```

**Metrics to capture:**

- First Contentful Paint
- Largest Contentful Paint
- Time to Interactive
- Total Blocking Time
- Cumulative Layout Shift

### Step 3: Virtual Scrolling Performance Test

Create performance test script:

```typescript
// performance-test.ts
async function testVirtualScrollPerformance() {
  // Navigate to dividend deposits with 1000+ records
  const page = await browser.newPage();
  await page.goto('http://localhost:4201/account/1/div-dep');

  // Wait for initial render
  await page.waitForSelector('cdk-virtual-scroll-viewport');

  // Measure scroll performance
  const metrics = await page.evaluate(() => {
    const viewport = document.querySelector('cdk-virtual-scroll-viewport');
    const frames: number[] = [];
    let lastTime = performance.now();

    return new Promise<{ avgFps: number; minFps: number }>((resolve) => {
      let scrollCount = 0;

      function onFrame() {
        const now = performance.now();
        frames.push(1000 / (now - lastTime));
        lastTime = now;

        if (scrollCount < 50) {
          viewport?.scrollBy(0, 100);
          scrollCount++;
          requestAnimationFrame(onFrame);
        } else {
          const avgFps = frames.reduce((a, b) => a + b) / frames.length;
          const minFps = Math.min(...frames);
          resolve({ avgFps, minFps });
        }
      }

      requestAnimationFrame(onFrame);
    });
  });

  console.log(`Average FPS: ${metrics.avgFps.toFixed(1)}`);
  console.log(`Minimum FPS: ${metrics.minFps.toFixed(1)}`);

  // Assert performance targets
  expect(metrics.avgFps).toBeGreaterThan(55);
  expect(metrics.minFps).toBeGreaterThan(30);
}
```

### Step 4: Lazy Loading Verification

Test that lazy loading triggers correctly:

```typescript
async function testLazyLoading() {
  const page = await browser.newPage();

  // Intercept API requests
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/div-deposits')) {
      requests.push(request.url());
    }
  });

  // Navigate to dividend deposits
  await page.goto('http://localhost:4201/account/1/div-dep');

  // Initial load should make one request
  expect(requests.length).toBe(1);

  // Scroll to trigger lazy load
  await page.evaluate(() => {
    const viewport = document.querySelector('cdk-virtual-scroll-viewport');
    viewport?.scrollTo(0, 5000);
  });

  // Wait for lazy load request
  await page.waitForTimeout(500);

  // Should have made additional request
  expect(requests.length).toBeGreaterThan(1);
}
```

### Step 5: Memory Leak Detection

```typescript
async function testMemoryLeaks() {
  const page = await browser.newPage();

  // Enable memory measurement
  await page.goto('http://localhost:4201');

  // Get initial memory
  const initialMemory = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize;
  });

  // Perform repeated operations
  for (let i = 0; i < 20; i++) {
    await page.goto('http://localhost:4201/account/1/div-dep');
    await page.waitForSelector('table');
    await page.goto('http://localhost:4201/global/universe');
    await page.waitForSelector('table');
  }

  // Force garbage collection if possible
  await page.evaluate(() => {
    if ((window as any).gc) {
      (window as any).gc();
    }
  });

  // Get final memory
  const finalMemory = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize;
  });

  // Memory should not grow significantly (< 20% increase)
  const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
  expect(memoryGrowth).toBeLessThan(0.2);
}
```

### Step 6: Compare with Original RMS

Run same benchmarks on original RMS application and compare:

| Metric         | RMS (PrimeNG) | RMS-Material | Improvement |
| -------------- | ------------- | ------------ | ----------- |
| Bundle Size    | TBD           | TBD          | TBD         |
| Initial Load   | TBD           | TBD          | TBD         |
| Scroll FPS     | TBD           | TBD          | TBD         |
| Lazy Load Time | TBD           | TBD          | TBD         |

## Performance Report Template

```markdown
# RMS-Material Performance Validation Report

## Date: [DATE]

## Summary

[Overall assessment of performance migration success]

## Bundle Size Comparison

| Bundle  | RMS  | RMS-Material | Delta |
| ------- | ---- | ------------ | ----- |
| main.js | X KB | Y KB         | Z%    |
| Total   | X KB | Y KB         | Z%    |

## Lighthouse Scores

| Page              | RMS | RMS-Material |
| ----------------- | --- | ------------ |
| Login             | X   | Y            |
| Dashboard         | X   | Y            |
| Dividend Deposits | X   | Y            |

## Virtual Scrolling Performance

| Metric  | RMS | RMS-Material | Target |
| ------- | --- | ------------ | ------ |
| Avg FPS | X   | Y            | >= 55  |
| Min FPS | X   | Y            | >= 30  |

## Lazy Loading

| Metric          | RMS  | RMS-Material |
| --------------- | ---- | ------------ |
| Initial Load    | X ms | Y ms         |
| Subsequent Load | X ms | Y ms         |

## Memory Usage

| Scenario     | RMS  | RMS-Material |
| ------------ | ---- | ------------ |
| Initial      | X MB | Y MB         |
| After 10 min | X MB | Y MB         |

## Conclusion

[Migration success/failure assessment]
[Recommendations]
```

## Definition of Done

- [ ] Bundle size analysis complete
- [ ] Lighthouse audits pass targets
- [ ] Virtual scrolling >= 55fps average
- [ ] Lazy loading works correctly
- [ ] No memory leaks detected
- [ ] Performance report documented
- [ ] Comparison with RMS shows improvement or parity
- [ ] PRIMARY DRIVER VALIDATED: Virtual scrolling with lazy loading works correctly

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

**Bundle & Load Performance:**

- [ ] Initial page load completes < 3 seconds
- [ ] Lighthouse FCP < 1.5 seconds
- [ ] Lighthouse TTI < 3.0 seconds

**Virtual Scrolling Performance:**

- [ ] Dividend deposits with 1000 rows loads successfully
- [ ] Scrolling maintains >= 55fps average
- [ ] DOM contains only visible rows plus buffer

**Lazy Loading:**

- [ ] Initial load makes single API request
- [ ] Scrolling triggers additional API requests
- [ ] Lazy load response < 200ms

**Memory:**

- [ ] Navigate 20x between pages without crash
- [ ] Memory does not grow > 20% after navigation cycles

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
