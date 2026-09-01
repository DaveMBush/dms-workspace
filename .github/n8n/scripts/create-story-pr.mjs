#!/usr/bin/env node
// Commits the story worktree, pushes its branch to origin, and opens (or reuses)
// a pull request against main. Run AFTER the review/fix loop has left the story
// at `Status: review` with an uncommitted dirty worktree on the story branch.
//
// Usage:
//   node .github/n8n/scripts/create-story-pr.mjs --story <id> \
//     [--root <worktree>] [--branch <b>] [--issue <num>] [--dry-run]
//
// Only --story is required. Run from inside the story worktree and everything
// else is discovered: --root defaults to cwd, --branch to the current git
// branch, and --issue to the number embedded in a branch named "issue-<num>-*"
// (the convention create-story-issue.mjs creates). Explicit flags always win.
//
// Example:
//   cd /home/dave/code/dms-workspace-issue-42 && \
//     node .github/n8n/scripts/create-story-pr.mjs --story 1.2
//
// Steps (idempotent — re-running reuses the existing commit/PR):
//   1. In <root>: if `git status` is dirty, `git add -A` and commit as
//      "feat(story <id>): <title>" (title read from the story file H1).
//   2. Push the branch to origin (`git push -u origin <branch>`), only if it has
//      commits not already on origin/<branch>.
//   3. Open a PR head=<branch> base=main, or reuse an existing open one. If
//      --issue is given, "Closes #<issue>" is included so the issue closes on merge.
//
// Prints a single JSON object to stdout:
//   {"prNumber": 43, "prUrl": "...", "branch": "...", "headSha": "...",
//    "committed": true, "pushed": true, "reusedPr": false}
// Exit 0 = success (PR open), 1 = operational error (git/gh failure), 2 = usage error.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = null; // optional — defaults to cwd (run from inside the worktree)
let branch = null; // optional — discovered via git when omitted
let storyId = null;
let issueNum = null; // optional — discovered from a "issue-<num>-*" branch name
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else if (args[i] === '--branch') branch = args[++i];
  else if (args[i] === '--story') storyId = args[++i];
  else if (args[i] === '--issue') issueNum = Number(args[++i]);
  else if (args[i] === '--dry-run') dryRun = true;
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: create-story-pr.mjs --story <id> [--root <worktree>] [--branch <b>] [--issue <num>] [--dry-run]',
    );
    process.exit(2);
  }
}

if (!storyId) {
  console.error('--story is required (e.g. --story 1.2)');
  process.exit(2);
}
projectRoot = projectRoot || process.cwd();
if (!existsSync(projectRoot)) {
  console.log(
    JSON.stringify(
      { error: 'worktree root does not exist', path: projectRoot },
      null,
      2,
    ),
  );
  process.exit(1);
}

function fail(msg, detail = {}) {
  console.log(JSON.stringify({ error: msg, ...detail }, null, 2));
  process.exit(1);
}

// Run a command in the worktree. Returns trimmed stdout; throws on non-zero exit.
function run(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// Run a command that may legitimately fail (e.g. `git status` porcelain is empty).
function runAllowFail(cmd, cmdArgs) {
  try {
    return {
      ok: true,
      out: execFileSync(cmd, cmdArgs, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim(),
    };
  } catch (e) {
    return {
      ok: false,
      out: String(e.stdout || '').trim(),
      err: String(e.stderr || e.message).trim(),
    };
  }
}

// --- Discover branch / issue when not given ----------------------------------
if (!branch) {
  const cur = runAllowFail('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!cur.ok || !cur.out || cur.out === 'HEAD') {
    fail('cannot discover current branch; pass --branch explicitly', {
      err: cur.err,
      cwd: projectRoot,
    });
  }
  branch = cur.out;
}
if (issueNum == null) {
  const m = String(branch).match(/^issue-(\d+)(?:-|$)/); // create-story-issue.mjs convention
  if (m) issueNum = Number(m[1]);
}

// --- Read story title for the commit/PR message ------------------------------
const idMatch = String(storyId).match(/^(\d+)\.\d+$/);
if (!idMatch) fail('--story must look like "<epic>.<number>"', { storyId });
const epicNum = Number(idMatch[1]);

let title = `Story ${storyId}`;
try {
  const epicDir = resolve(
    projectRoot,
    `_bmad-output/implementation-artifacts/stories/epic-${epicNum}`,
  );
  if (existsSync(epicDir)) {
    const storyFile = readdirSync(epicDir).find(
      (f) => f.endsWith('.md') && f.startsWith(`${storyId}-`),
    );
    if (storyFile) {
      const h1 = readFileSync(resolve(epicDir, storyFile), 'utf8').match(
        /^#\s+(.+)$/m,
      );
      if (h1) title = h1[1].trim();
    }
  }
} catch {
  /* non-fatal: fall back to "Story <id>" */
}

const commitMsg = `feat(story ${storyId}): ${title}`;

// --- 1. Commit the worktree if dirty ----------------------------------------
let committed = false;
const status = runAllowFail('git', ['status', '--porcelain']);
if (!status.ok) fail('git status failed in worktree', { err: status.err });
const isDirty = status.out.length > 0;

if (isDirty && !dryRun) {
  try {
    run('git', ['add', '-A']);
    run('git', ['commit', '-m', commitMsg]);
    committed = true;
  } catch (e) {
    fail('git add/commit failed', { stderr: String(e.stderr || e.message) });
  }
}

// --- 2. Push the branch if it has unpushed commits ---------------------------
let pushed = false;
const headSha = runAllowFail('git', ['rev-parse', 'HEAD']);
if (!headSha.ok) fail('cannot read HEAD in worktree', { err: headSha.err });

// Does origin/<branch> exist and is it behind local?
const remoteRef = runAllowFail('git', [
  'ls-remote',
  '--heads',
  'origin',
  branch,
]);
let needsPush = true;
if (remoteRef.ok && remoteRef.out) {
  const [remoteSha] = remoteRef.out.split('\t');
  // If the local HEAD is an ancestor of / equal to the remote tip, nothing new to push.
  const mergeBase = runAllowFail('git', [
    'merge-base',
    '--is-ancestor',
    headSha.out,
    remoteSha,
  ]);
  needsPush = !mergeBase.ok; // not an ancestor => has unpushed commits
}

if (needsPush && !dryRun) {
  try {
    run('git', ['push', '-u', 'origin', branch]);
    pushed = true;
  } catch (e) {
    fail('git push failed', { stderr: String(e.stderr || e.message), branch });
  }
}

// --- 3. Open or reuse the PR -------------------------------------------------
const prTitle = `Story ${storyId}: ${title}`;
let existingPr = null;
try {
  const listOut = run('gh', [
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'open',
    '--json',
    'number,url,state',
  ]);
  const found = JSON.parse(listOut);
  if (Array.isArray(found) && found.length > 0) existingPr = found[0];
} catch {
  /* no open PR for this head; fall through to create */
}

let prNumber,
  prUrl,
  reusedPr = false;
if (existingPr) {
  prNumber = existingPr.number;
  prUrl = existingPr.url;
  reusedPr = true;
} else if (!dryRun) {
  const bodyParts = [
    `**Story:** ${storyId}`,
    issueNum ? `Closes #${issueNum}` : null,
    '',
    title,
  ].filter(Boolean);
  try {
    const out = run('gh', [
      'pr',
      'create',
      '--head',
      branch,
      '--base',
      'main',
      '--title',
      prTitle,
      '--body',
      bodyParts.join('\n'),
      '--json',
      'number,url,state',
    ]);
    const created = JSON.parse(out);
    prNumber = created.number;
    prUrl = created.url;
  } catch (e) {
    fail('gh pr create failed', {
      stderr: String(e.stderr || e.message),
      branch,
    });
  }
} else {
  // dry-run: report what would happen without creating anything.
  prNumber = null;
  prUrl = null;
}

console.log(
  JSON.stringify(
    {
      prNumber,
      prUrl,
      branch,
      headSha: headSha.out || null,
      committed,
      pushed,
      reusedPr,
      dryRun,
      commitMsg,
    },
    null,
    2,
  ),
);
