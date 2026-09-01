#!/usr/bin/env node
// Reports the next epic that has at least one story not yet completed.
// Scans _bmad-output/implementation-artifacts/stories/epic-*/ and reads each
// story file's "Status:" line (same convention as validate-epics-and-stories.mjs).
//
// Usage:
//   node .github/n8n/scripts/report-incomplete-epics.mjs [--root <dir>] [--include-skip]
//
// Statuses counted as NOT completed: ready-for-dev, in-progress, blocked (and any unknown value).
// "done" and "skip" count as completed unless --include-skip is given.
//
// Prints a single JSON object to stdout: {"nextEpic": <n>} or {"nextEpic": null} when all complete.
// Exit 0 = success, 1 = stories dir missing, 2 = usage error.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let includeSkip = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else if (args[i] === '--include-skip') includeSkip = true;
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: report-incomplete-epics.mjs [--root <dir>] [--include-skip]',
    );
    process.exit(2);
  }
}

const storiesDir = resolve(
  projectRoot,
  '_bmad-output/implementation-artifacts/stories',
);
if (!existsSync(storiesDir)) {
  console.log(
    JSON.stringify(
      { error: 'stories directory not found', path: storiesDir },
      null,
      2,
    ),
  );
  process.exit(1);
}

const completedStatuses = new Set(['done']);
if (!includeSkip) completedStatuses.add('skip');

let nextEpic = null;

for (const entry of readdirSync(storiesDir).sort((a, b) => {
  const na = Number(a.match(/^epic-(\d+)$/)?.[1] ?? Infinity);
  const nb = Number(b.match(/^epic-(\d+)$/)?.[1] ?? Infinity);
  return na - nb;
})) {
  const m = entry.match(/^epic-(\d+)$/);
  if (!m) continue;

  let files;
  try {
    files = readdirSync(resolve(storiesDir, entry)).filter((f) =>
      f.endsWith('.md'),
    );
  } catch {
    continue; // not a directory
  }

  const hasIncomplete = files.some((file) => {
    const content = readFileSync(resolve(storiesDir, entry, file), 'utf8');
    const statusMatch = content.match(/^Status:\s*(\S+)/m);
    return !completedStatuses.has(statusMatch ? statusMatch[1] : 'missing');
  });

  if (hasIncomplete) {
    nextEpic = Number(m[1]);
    break;
  }
}

console.log(JSON.stringify({ nextEpic }, null, 2));
