#!/usr/bin/env node
// Reports the next story (lowest-numbered, not yet completed) within a given epic.
// Scans _bmad-output/implementation-artifacts/stories/epic-<N>/ and reads each
// story file's "Status:" line (same convention as validate-epics-and-stories.mjs).
//
// Usage:
//   node .github/n8n/scripts/report-next-story.mjs --epic <n> [--root <dir>] [--include-skip]
//
// Statuses counted as NOT completed: ready-for-dev, in-progress, blocked (and any unknown value).
// "done", "review" (implemented, awaiting human/adversarial review), and "skip" count as
// completed unless --include-skip is given.
//
// Prints a single JSON object to stdout:
//   {"nextStory": "1.2", "file": "epic-1/1.2-....md", "status": "ready-for-dev"}
// or {"nextStory": null} when every story in the epic is complete.
// Exit 0 = success, 1 = epic directory missing, 2 = usage error.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let includeSkip = false;
let epicNum = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else if (args[i] === '--include-skip') includeSkip = true;
  else if (args[i] === '--epic') epicNum = Number(args[++i]);
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: report-next-story.mjs --epic <n> [--root <dir>] [--include-skip]',
    );
    process.exit(2);
  }
}

if (epicNum === null || !Number.isInteger(epicNum) || epicNum < 1) {
  console.error('--epic requires a positive integer');
  process.exit(2);
}

const epicDir = resolve(
  projectRoot,
  `_bmad-output/implementation-artifacts/stories/epic-${epicNum}`,
);
if (!existsSync(epicDir)) {
  console.log(
    JSON.stringify(
      { error: 'epic directory not found', path: epicDir },
      null,
      2,
    ),
  );
  process.exit(1);
}

// "review" is terminal for the implementation run: DF2 leaves stories there for a
// human/adversarial review step, so the next-story loop must advance past them.
const completedStatuses = new Set(['done', 'review']);
if (!includeSkip) completedStatuses.add('skip');

// Story files are named "<epic>.<story>-slug.md"; sort by numeric story number.
const files = readdirSync(epicDir)
  .filter((f) => f.endsWith('.md'))
  .sort((a, b) => {
    const na = Number(a.match(/^(\d+)\.(\d+)/)?.[2] ?? Infinity);
    const nb = Number(b.match(/^(\d+)\.(\d+)/)?.[2] ?? Infinity);
    return na - nb;
  });

let nextStory = null;
for (const file of files) {
  const content = readFileSync(resolve(epicDir, file), 'utf8');
  const statusMatch = content.match(/^Status:\s*(\S+)/m);
  const status = statusMatch ? statusMatch[1] : 'missing';
  if (!completedStatuses.has(status)) {
    nextStory = {
      id: file.match(/^(\d+\.\d+)-/)?.[1] ?? null,
      file: `epic-${epicNum}/${file}`,
      title: file.replace(/^\d+\.\d+-/, '').replace(/\.md$/, ''),
      status,
    };
    break;
  }
}

console.log(JSON.stringify({ nextStory }, null, 2));
