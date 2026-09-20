#!/usr/bin/env node
// Reports the next story (lowest-numbered, not yet completed) within a given epic.
// Scans _bmad-output/implementation-artifacts/stories/epic-<N>/ and reads each
// story file's "Status:" line (same convention as validate-epics-and-stories.mjs).
//
// Branch-aware: after `git fetch origin`, every remote issue-* branch is also
// scanned. DF2 pushes a status-flip commit to the story's branch at each
// transition, so the branch tip is the durable source of truth for in-flight
// stories. Per story, the most advanced status wins across main and branches:
// done > review > in-progress > ready-for-dev. "blocked" is surfaced (never
// ranked) — a blocked story still counts as incomplete.
//
// Usage:
//   node .github/n8n/scripts/report-next-story.mjs --epic <n> [--root <dir>] [--include-skip]
//
// Statuses counted as NOT completed: ready-for-dev, in-progress, review, blocked (and any unknown value).
// "done" counts as completed; "skip" counts as completed unless --include-skip is given.
//
// Prints a single JSON object to stdout:
//   {"nextStory": {"id": "1.2", "file": "epic-1/1.2-....md", "title": "...", "status": "ready-for-dev"},
//    "activeBranches": {"1.2": {"branch": "issue-42-slug", "status": "review"}}}
// or {"nextStory": null, "activeBranches": {}} when every story in the epic is complete.
// activeBranches maps story id -> {branch, status} for remote issue-* branches that carry a live copy of the epic's stories.
// Exit 0 = success, 1 = epic directory missing, 2 = usage error.
import { execFileSync } from 'node:child_process';
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
const completedStatuses = new Set(['done']);
if (!includeSkip) completedStatuses.add('skip');

// Story files are named "<epic>.<story>-slug.md"; sort by numeric story number.
const files = readdirSync(epicDir)
  .filter((f) => f.endsWith('.md') && /^\d+\.\d+-/.test(f))
  .sort((a, b) => {
    const na = Number(a.match(/^(\d+)\.(\d+)/)?.[2] ?? Infinity);
    const nb = Number(b.match(/^(\d+)\.(\d+)/)?.[2] ?? Infinity);
    return na - nb;
  });

// --- Branch-aware status merge ----------------------------------------------
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

const epicRel = `_bmad-output/implementation-artifacts/stories/epic-${epicNum}`;

// Most advanced status wins across main and branches. "blocked" is surfaced,
// never ranked — it still counts as incomplete.
const RANK = { 'ready-for-dev': 0, 'in-progress': 1, review: 2, done: 3 };
function mergeStatuses(statuses) {
  let best = null;
  for (const s of statuses) {
    if (!s || s === 'missing') continue;
    if (best === null) {
      best = s;
      continue;
    }
    const rb = RANK[best];
    const rs = RANK[s];
    if (rb !== undefined && rs !== undefined) {
      if (rs > rb) best = s;
    } else if (s === 'blocked' && best !== 'blocked') {
      best = s;
    }
  }
  return best ?? 'missing';
}

// Remote issue-* branches that carry a live copy of this epic's stories.
const branchStatuses = new Map(); // storyId -> [{branch, status}]
let activeBranches = {};
try {
  git(['fetch', 'origin']);
  const lsRemote = git(['ls-remote', '--heads', 'origin', 'issue-*']) ?? '';
  for (const line of lsRemote.split('\n')) {
    const ref = line.trim().split(/\s+/).pop();
    if (!ref) continue;
    const branch = ref.replace(/^refs\/heads\//, '');
    const listing = git(['ls-tree', '--name-only', `${branch}:${epicRel}`]);
    if (listing === null || listing === '') continue; // no live story files on this branch
    for (const f of listing.split('\n')) {
      if (!f.endsWith('.md') || !/^\d+\.\d+-/.test(f)) continue;
      const id = f.match(/^(\d+\.\d+)-/)?.[1];
      if (!id) continue;
      let status = 'missing';
      const blob = git(['show', `${branch}:${epicRel}/${f}`]);
      if (blob !== null) {
        const m = blob.match(/^Status:\s*(\S+)/m);
        if (m) status = m[1];
      }
      if (!branchStatuses.has(id)) branchStatuses.set(id, []);
      branchStatuses.get(id).push({ branch, status });
      activeBranches[id] = { branch, status };
    }
  }
} catch {
  // git/network failure: fall back to main-only evaluation.
}

let nextStory = null;
for (const file of files) {
  const content = readFileSync(resolve(epicDir, file), 'utf8');
  const statusMatch = content.match(/^Status:\s*(\S+)/m);
  const localStatus = statusMatch ? statusMatch[1] : 'missing';
  const id = file.match(/^(\d+\.\d+)-/)?.[1];
  const branchEntries = (id && branchStatuses.get(id)) || [];
  const status = mergeStatuses([localStatus, ...branchEntries.map((e) => e.status)]);
  if (!completedStatuses.has(status)) {
    nextStory = {
      id: id ?? null,
      file: `epic-${epicNum}/${file}`,
      title: file.replace(/^\d+\.\d+-/, '').replace(/\.md$/, ''),
      status,
    };
    break;
  }
}

console.log(JSON.stringify({ nextStory, activeBranches }, null, 2));
