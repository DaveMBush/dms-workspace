import * as fs from 'node:fs';
import * as path from 'node:path';

import { expect, test } from '@playwright/test';

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type: string;
}

interface StorybookIndex {
  entries: Record<string, StoryEntry>;
}

const indexPath = path.resolve('dist/storybook/index.json');

if (!fs.existsSync(indexPath)) {
  throw new Error(
    `Storybook index not found at ${indexPath}. Run "pnpm storybook:build" first.`
  );
}

const storybookIndex: StorybookIndex = JSON.parse(
  fs.readFileSync(indexPath, 'utf-8')
);

const stories = Object.values(storybookIndex.entries).filter(function isStory(
  entry
): entry is StoryEntry {
  return entry.type === 'story';
});

for (const story of stories) {
  test(`visual: ${story.title} / ${story.name}`, async function runVisualTest({
    page,
  }) {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${story.id}.png`);
  });
}
