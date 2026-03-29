import { test } from 'playwright/test';

import { captureStoryInBothThemes } from './helpers/storybook-theme-snapshot';

/**
 * Storybook dual-theme snapshot tests.
 *
 * Each story is rendered in both Light and Dark themes and compared
 * against baseline screenshots. On the first run the baselines are
 * created automatically; subsequent runs fail when pixels differ.
 */
test.describe('Storybook Dual-Theme Snapshots', function storybookSnapshots() {
  test('Introduction - Welcome', async function testWelcome({ page }) {
    await captureStoryInBothThemes(page, 'introduction--welcome');
  });

  test('Splitter - Default', async function testSplitterDefault({ page }) {
    await captureStoryInBothThemes(page, 'components-splitter--default');
  });

  test('EditableCell - Default', async function testEditableCellDefault({
    page,
  }) {
    await captureStoryInBothThemes(page, 'components-editablecell--default');
  });

  test('BaseTable - Default', async function testBaseTableDefault({ page }) {
    await captureStoryInBothThemes(page, 'shared-basetable--default');
  });

  test('BaseTable - EmptyState', async function testBaseTableEmptyState({
    page,
  }) {
    await captureStoryInBothThemes(page, 'shared-basetable--empty-state');
  });

  test('BaseTable - UniverseTableVariation', async function testBaseTableUniverseTableVariation({
    page,
  }) {
    await captureStoryInBothThemes(
      page,
      'shared-basetable--universe-table-variation'
    );
  });
});
