#!/usr/bin/env node
// Reports the next epic that has at least one story not yet completed.
// Scans _bmad-output/implementation-artifacts/stories/epic-*/ and reads each
// story file's "Status:" line (same convention as validate-epics-and-stories.mjs).
//
// Branch-aware: after `git fetch origin`, remote issue-* branches are also
// scanned. DF2 pushes a status-flip commit to the story's branch at each
// transition, so an epic whose stories live only on unmerged branches still
// counts as incomplete. A story present on main is judged by its main status
// (branch statuses can only be less advanced than what merges back).
//
// Usage:
//   node .github/n8n/scripts/report-incomplete-epics.mjs [--root <dir>] [--include-skip]
//
// Statuses counted as NOT completed: ready-for-dev, in-progress, review, blocked (and any unknown value).
// "done" counts as completed; "skip" counts as completed unless --include-skip is given.
//
// Prints a single JSON object to stdout: {"nextEpic": <n>} or {"nextEpic": null} when all complete.
// Exit 0 = success, 1 = stories dir missing, 2 = usage error.
import { execFileSync } from 'node:child_process';
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

// "review" is terminal for the implementation run: DF2 leaves stories there for a
// human/adversarial review step, so the epic loop must advance past them.
const completedStatuses = new Set(['done']);
if (!includeSkip) completedStatuses.add('skip');

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

const storiesRel = '_bmad-output/implementation-artifacts/stories';

// Remote issue-* branches (DF2 worktree branches).
let remoteBranches = [];
try {
  git(['fetch', 'origin']);
  const lsRemote = git(['ls-remote', '--heads', 'origin', 'issue-*']) ?? '';
  for (const line of lsRemote.split('\n')) {
    const ref = line.trim().split(/\s+/).pop();
    if (!ref) continue;
    remoteBranches.push(ref.replace(/^refs\/heads\//, ''));
  }
} catch {
  // git/network failure: fall back to main-only evaluation.
}

// Epic numbers present locally or on any remote branch.
const epicNums = new Set(
  readdirSync(storiesDir)
    .filter((e) => /^epic-\d+$/.test(e))
    .map((e) => Number(e.match(/^epic-(\d+)$/)[1])),
);
for (const branch of remoteBranches) {
  const listing = git(['ls-tree', '--name-only', `${branch}:${storiesRel}`]);
  if (!listing) continue;
  for (const line of listing.split('\n')) {
    const m = line.trim().match(/^epic-(\d+)$/);
    if (m) epicNums.add(Number(m[1]));
  }
}

let nextEpic = null;
for (const n of [...epicNums].sort((a, b) => a - b)) {
  const epicDir = resolve(storiesDir, `epic-${n}`);
  let hasIncomplete = false;

  // Main: any story incomplete here settles the epic immediately.
  if (existsSync(epicDir)) {
    for (const f of readdirSync(epicDir).filter(
      (f) => f.endsWith('.md') && /^\d+\.\d+-/.test(f),
    )) {
      const content = readFileSync(resolve(epicDir, f), 'utf8');
      const m = content.match(/^Status:\s*(\S+)/m);
      if (!completedStatuses.has(m ? m[1] : 'missing')) {
        hasIncomplete = true;
        break;
      }
    }
  }

  // Branch-only stories (not yet merged to main) can still make the epic incomplete.
  if (!hasIncomplete && remoteBranches.length > 0) {
    const mainFiles = existsSync(epicDir) ? new Set(readdirSync(epicDir)) : new Set();
    for (const branch of remoteBranches) {
      const listing = git([
        'ls-tree',
        '--name-only',
        `${branch}:${storiesRel}/epic-${n}`,
      ]);
      if (!listing) continue;
      for (const f of listing.split('\n')) {
        if (!f.endsWith('.md') || !/^\d+\.\d+-/.test(f)) continue;
        if (mainFiles.has(f)) continue; // main status already judged it complete
        const blob = git(['show', `${branch}:${storiesRel}/epic-${n}/${f}`]);
        const m = blob ? blob.match(/^Status:\s*(\S+)/m) : null;
        if (!completedStatuses.has(m ? m[1] : 'missing')) {
          hasIncomplete = true;
          break;
        }
      }
      if (hasIncomplete) break;
    }
  }

  if (hasIncomplete) {
    nextEpic = n;
    break;
  }
}

console.log(JSON.stringify({ nextEpic }, null, 2));
