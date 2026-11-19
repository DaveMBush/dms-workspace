// Deliberately mis-ordered import fixture for Story 24.1 Task 2 (AC #2).
//
// `node:path` is imported before `node:fs`, which violates the alphabetical
// order that the `import/order` rule (added by Story 24.2) will enforce in
// eslint.config.mjs. Both imports are used so unused-imports rules do not
// fire, and every currently active ESLint rule passes on this file — only a
// future import/order rule should flag it. Do NOT "fix" the order;
// naming-and-import-order.spec.ts depends on it staying mis-ordered.

import { basename } from 'node:path';
import { existsSync } from 'node:fs';

/** Whether the fixture file itself exists on disk. */
export const importOrderFixture = existsSync(
  basename('import-order-fixture.ts'),
);
