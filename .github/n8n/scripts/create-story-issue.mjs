#!/usr/bin/env node
// Creates a GitHub issue from a story file, then creates a branch off origin/main
// named after the issue and attaches a local git worktree to it.
//
// Usage:
//   node .github/n8n/scripts/create-story-issue.mjs --story <id> [--root <dir>]
//
// Example:
//   node .github/n8n/scripts/create-story-issue.mjs --story 1.2
//
// The epic number is derived from the story id prefix (1.2 -> epic-1).
//
// Steps (all idempotent — re-running reuses existing issue/branch/worktree):
//   1. Read story file _bmad-output/implementation-artifacts/stories/epic-<n>/<id>-*.md
//   2. Create GitHub issue "Story <id>: <title>" with the full story as body
//      (searches for an existing open issue with the same title first)
//   3. git fetch origin main; branch "issue-<num>-<slug>" from origin/main
//   4. git worktree add at <parent-of-root>/<basename(root)>-issue-<num>
//      (override location with --worktree-dir <dir>)
//
// Prints a single JSON object to stdout:
//   {"issueNumber": 42, "issueUrl": "...", "branch": "issue-42-slug", "worktreePath": "/abs/path"}
// Exit 0 = success, 1 = operational error (story/epic missing, gh or git failure), 2 = usage error.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let worktreeDirOverride = null;
let epicNum = null;
let storyId = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else if (args[i] === '--worktree-dir')
    worktreeDirOverride = resolve(args[++i]);
  else if (args[i] === '--epic')
    epicNum = Number(args[++i]); // optional override; default derived from story id
  else if (args[i] === '--story') storyId = args[++i];
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: create-story-issue.mjs --story <id> [--root <dir>] [--worktree-dir <dir>]',
    );
    process.exit(2);
  }
}

if (!storyId) {
  console.error('--story <id like 1.2> is required');
  process.exit(2);
}

// Derive epic from the story id prefix (e.g. "1.2" -> epic 1) unless overridden.
const idMatch = String(storyId).match(/^(\d+)\.\d+$/);
if (!idMatch) {
  console.error(`--story must look like "<epic>.<number>" (got "${storyId}")`);
  process.exit(2);
}
if (epicNum === null) epicNum = Number(idMatch[1]);

function fail(msg, detail = {}) {
  console.log(JSON.stringify({ error: msg, ...detail }, null, 2));
  process.exit(1);
}

function run(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// --- 1. Locate and read story file -----------------------------------------
const epicDir = resolve(
  projectRoot,
  `_bmad-output/implementation-artifacts/stories/epic-${epicNum}`,
);
if (!existsSync(epicDir)) fail('epic directory not found', { path: epicDir });

const prefix = `${storyId}-`;
const storyFile = readdirSync(epicDir).find(
  (f) => f.endsWith('.md') && f.startsWith(prefix),
);
if (!storyFile)
  fail(`no story file matching "${prefix}*.md"`, { dir: epicDir });

const storyContent = readFileSync(resolve(epicDir, storyFile), 'utf8');
const h1Match = storyContent.match(/^#\s+(.+)$/m);
const title = (
  h1Match ? h1Match[1] : storyFile.slice(prefix.length, -3)
).trim();

// --- 2. Create (or reuse) GitHub issue --------------------------------------
const issueTitle = `Story ${storyId}: ${title}`;
let existingIssue = null;
try {
  const searchOut = run('gh', [
    'issue',
    'list',
    '--state',
    'open',
    '--search',
    `"${issueTitle}" in:title`,
    '--limit',
    '1',
    '--json',
    'number,url',
  ]);
  const found = JSON.parse(searchOut);
  if (Array.isArray(found) && found.length > 0) existingIssue = found[0];
} catch {
  /* gh search failed; fall through to create */
}

let issueNumber, issueUrl;
if (existingIssue) {
  issueNumber = existingIssue.number;
  issueUrl = existingIssue.url;
} else {
  const body = [
    `**Epic:** ${epicNum}`,
    `**Story:** ${storyId}`,
    '',
    '---',
    '',
    storyContent,
  ].join('\n');
  let out;
  try {
    // gh issue create has no --json flag; it prints the new issue URL.
    out = run('gh', [
      'issue',
      'create',
      '--title',
      issueTitle,
      '--body',
      body,
    ]);
  } catch (e) {
    fail('gh issue create failed', { stderr: String(e.stderr || e.message) });
  }
  const urlMatch = out.match(/issues\/(\d+)/);
  if (!urlMatch)
    fail('could not parse issue number from gh output', { stdout: out });
  issueNumber = Number(urlMatch[1]);
  issueUrl = out;
}

// --- 3. Branch off origin/main named after the issue ------------------------
const slug =
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || storyId.replace(/\./g, '-');
const branch = `issue-${issueNumber}-${slug}`;

try {
  run('git', ['fetch', 'origin', 'main']);
} catch (e) {
  fail('git fetch origin main failed', {
    stderr: String(e.stderr || e.message),
  });
}

// --- 4. Worktree -------------------------------------------------------------
const defaultWt = resolve(
  dirname(projectRoot),
  `${basename(projectRoot)}-issue-${issueNumber}`,
);
const worktreePath = worktreeDirOverride ?? defaultWt;

try {
  if (existsSync(worktreePath)) {
    // Re-run: verify it is a worktree of this repo on the expected branch.
    const wtList = run('git', ['worktree', 'list', '--porcelain']);
    const entries = wtList
      .split('\n\n')
      .filter(Boolean)
      .map((block) => {
        const p = block.match(/^worktree (.+)$/m)?.[1];
        const b = block
          .match(/^branch (.+)$/m)?.[1]
          ?.replace('refs/heads/', '');
        return { path: p, branch: b };
      });
    const existingWt = entries.find((e) => e.path === worktreePath);
    if (
      existingWt &&
      existingWt.branch !== `refs/heads/${branch}` &&
      existingWt.branch !== branch
    ) {
      fail('worktree path exists but is on a different branch', {
        worktreePath,
        branch: existingWt.branch,
      });
    }
  } else {
    const branchExists = run('git', ['branch', '--list', branch]) === branch;
    if (branchExists) {
      run('git', ['worktree', 'add', worktreePath, branch]);
    } else {
      run('git', [
        'worktree',
        'add',
        '-b',
        branch,
        worktreePath,
        'origin/main',
      ]);
    }
  }
} catch (e) {
  fail('git worktree setup failed', {
    stderr: String(e.stderr || e.message),
    worktreePath,
  });
}

console.log(
  JSON.stringify(
    {
      issueNumber,
      issueUrl,
      branch,
      worktreePath,
      storyFile: `epic-${epicNum}/${storyFile}`,
    },
    null,
    2,
  ),
);
