#!/usr/bin/env node
// Final step of the Dark Factory 2 pipeline: mark the story done, merge its PR
// into main, then tear down the story worktree and branch and switch the primary
// checkout back to an up-to-date main. Run only after CodeRabbit is clean AND CI
// (job `main`) has passed on the PR head.
//
// Usage:
//   node .github/n8n/scripts/merge-story-pr.mjs \
//     [--root <worktree>] [--branch <b>] [--story <id>] [--pr <num>] \
//     [--primary <dir>] [--method squash] [--dry-run]
//
// All parameters are optional. Run from inside the story worktree and everything
// is discovered: --root defaults to cwd, --branch to the current git branch,
// --story to the id in a recent commit subject ("feat(story 1.2): ..." /
// "chore(story 1.2): mark done"), and --pr to the open PR on that head branch.
// Explicit flags always win.
//
// Steps (each idempotent — re-running is safe):
//   1. In <root>: set the story file's `Status:` to `done` — and, when a paired
//      unit-test story ({N}.{M-1}) exists in the same epic dir, that one too —
//      then `git add -A` + commit "chore(story <id>): mark done" and push (so the
//      flip lands on main with the merge). This is now the single owner of the
//      final flip: review leaves stories at `review`. Commit/push skipped if both
//      were already `done` (re-run).
//   2. Merge the PR into main (`gh pr merge --<method>`; default squash). If the
//      PR is already merged/closed, skip and report it.
//   3. Remove the story worktree (`git worktree remove`), delete the local branch
//      and the remote head branch (tolerating "already gone").
//   4. In the primary checkout: fetch + switch to main + fast-forward pull so main
//      reflects the merge. Refuses if the primary has uncommitted changes that a
//      checkout would clobber.
//
// Prints a single JSON object to stdout:
//   {"prNumber":43,"branch":"...","storyId":"1.2",
//    "statusBefore":"review","statusAfter":"done","committedDone":true,
//    "merged":true,"alreadyMerged":false,
//    "worktreeRemoved":true,"localBranchDeleted":true,"remoteBranchDeleted":true,
//    "primaryOnMain":true,"primarySha":"..."}
// Exit 0 = success (story done + merged + cleaned up), 1 = operational error,
//        2 = usage error.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = null; // optional — defaults to cwd (run from inside the worktree)
let branch = null; // optional — discovered via git when omitted
let storyId = null; // optional — discovered from recent commit subjects
let prNum = null; // optional — discovered via gh pr list --head <branch>
let primaryOverride = null;
let method = 'squash';
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') projectRoot = resolve(args[++i]);
  else if (args[i] === '--branch') branch = args[++i];
  else if (args[i] === '--story') storyId = args[++i];
  else if (args[i] === '--pr') prNum = Number(args[++i]);
  else if (args[i] === '--primary') primaryOverride = resolve(args[++i]);
  else if (args[i] === '--method') method = args[++i];
  else if (args[i] === '--dry-run') dryRun = true;
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: merge-story-pr.mjs [--root <worktree>] [--branch <b>] [--story <id>] [--pr <num>] [--primary <dir>] [--method squash|merge|rebase] [--dry-run]',
    );
    process.exit(2);
  }
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

// Run in the story worktree.
function run(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
// Run in the primary checkout.
function runPrimary(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, {
    cwd: primaryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function runAllowFail(cwd, cmd, cmdArgs) {
  try {
    return {
      ok: true,
      out: execFileSync(cmd, cmdArgs, {
        cwd,
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

// --- Discover branch / story / PR when not given ----------------------------
if (!branch) {
  const cur = runAllowFail(projectRoot, 'git', [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ]);
  if (!cur.ok || !cur.out || cur.out === 'HEAD') {
    fail('cannot discover current branch; pass --branch explicitly', {
      err: cur.err,
      cwd: projectRoot,
    });
  }
  branch = cur.out;
}
if (!storyId) {
  // create-story-pr.mjs commits as "feat(story <id>): ..." and this script's own
  // status flip as "chore(story <id>): mark done" — scan recent subjects.
  const log = runAllowFail(projectRoot, 'git', [
    'log',
    '--format=%s',
    '-n',
    '20',
  ]);
  if (!log.ok)
    fail('cannot read git log to discover story id; pass --story explicitly', {
      err: log.err,
    });
  for (const line of log.out.split('\n')) {
    const m = line.match(/^(?:feat|chore)\(story (\d+\.\d+)\):/);
    if (m) {
      storyId = m[1];
      break;
    }
  }
  if (!storyId)
    fail(
      'no recent commit subject contains a story id; pass --story explicitly',
      { branch },
    );
}
if (!prNum) {
  try {
    const listOut = run('gh', [
      'pr',
      'list',
      '--head',
      branch,
      '--state',
      'open',
      '--json',
      'number',
    ]);
    const found = JSON.parse(listOut);
    if (Array.isArray(found) && found.length > 0) prNum = found[0].number;
  } catch {
    /* no open PR for this head */
  }
  if (!prNum)
    fail('no open PR found on branch ' + branch + '; pass --pr explicitly', {
      branch,
    });
}

// --- Resolve the primary checkout root --------------------------------------
let primaryRoot = primaryOverride;
if (!primaryRoot) {
  const commonDir = runAllowFail(projectRoot, 'git', [
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  ]);
  if (commonDir.ok && commonDir.out) primaryRoot = dirname(commonDir.out); // <primary>/.git -> <primary>
}
if (!primaryRoot || !existsSync(primaryRoot))
  fail('cannot resolve primary checkout; pass --primary <dir>', {
    resolved: primaryRoot,
  });

// --- Locate the story file in the worktree ----------------------------------
const idMatch = String(storyId).match(/^(\d+)\.\d+$/);
if (!idMatch) fail('--story must look like "<epic>.<number>"', { storyId });
const epicNum = Number(idMatch[1]);
const epicDir = resolve(
  projectRoot,
  `_bmad-output/implementation-artifacts/stories/epic-${epicNum}`,
);
let storyFileAbs = null;
if (existsSync(epicDir)) {
  const f = readdirSync(epicDir).find(
    (x) => x.endsWith('.md') && x.startsWith(`${storyId}-`),
  );
  if (f) storyFileAbs = resolve(epicDir, f);
}

// --- 1. Flip status to done + commit/push -----------------------------------
// Review no longer flips status (it leaves the story at `review`); this is now
// the single owner of the final flip, and it runs only after CodeRabbit + CI
// pass. It marks BOTH the main story and its paired unit-test story ({N}.{M-1})
// done so report-incomplete-epics (which counts only `done`) stays accurate.
let statusBefore = null;
let statusAfter = 'done';
let committedDone = false;
if (!storyFileAbs || !existsSync(storyFileAbs)) {
  fail('story file not found in worktree', {
    expected: `epic-${epicNum}/${storyId}-*.md`,
  });
}

const storyText = readFileSync(storyFileAbs, 'utf8');
statusBefore = (storyText.match(/^Status:\s*(\S+)/m) || [])[1] ?? null;

// Paired unit-test story: {N}.{M-1}-*.md in the same epic directory.
let pairedId = null;
const subNum = Number(storyId.split('.')[1]);
if (Number.isInteger(subNum) && subNum > 1) {
  pairedId = `${storyId.split('.')[0]}.${subNum - 1}`;
}
let pairedFileAbs = null;
if (pairedId && existsSync(epicDir)) {
  const pf = readdirSync(epicDir).find(
    (x) => x.endsWith('.md') && x.startsWith(`${pairedId}-`),
  );
  if (pf) pairedFileAbs = resolve(epicDir, pf);
}

const flipToDone = (absPath) => {
  const text = readFileSync(absPath, 'utf8');
  return text.replace(/^Status:.*$/m, 'Status: done');
};

if (!dryRun) {
  try {
    writeFileSync(storyFileAbs, flipToDone(storyFileAbs));
    if (pairedFileAbs && existsSync(pairedFileAbs)) {
      writeFileSync(pairedFileAbs, flipToDone(pairedFileAbs));
    }
    run('git', ['add', '-A']);
    // Idempotent: --quiet exits 0 when nothing is staged. Skip commit/push if
    // both files were already `done` (re-run) so a no-op doesn't fail the merge.
    const staged = runAllowFail(projectRoot, 'git', [
      'diff',
      '--cached',
      '--quiet',
    ]);
    if (!staged.ok) {
      const commitMsg = pairedFileAbs
        ? `chore(story ${storyId}): mark done (incl. unit-test story ${pairedId})`
        : `chore(story ${storyId}): mark done`;
      run('git', ['commit', '-m', commitMsg]);
      run('git', ['push', 'origin', branch]);
      committedDone = true;
    }
  } catch (e) {
    fail('failed to commit/push status flip', {
      stderr: String(e.stderr || e.message),
      branch,
    });
  }
}

// --- 2. Merge the PR ---------------------------------------------------------
let merged = false;
let alreadyMerged = false;
try {
  const prState = JSON.parse(
    run('gh', ['pr', 'view', String(prNum), '--json', 'state,mergeable'], {
      encoding: 'utf8',
    }),
  );
  if (prState.state === 'MERGED') {
    alreadyMerged = true;
  } else if (!dryRun) {
    run('gh', [
      'pr',
      'merge',
      String(prNum),
      `--${method}`,
      '--delete-branch=false',
    ]);
    merged = true;
  }
} catch (e) {
  fail('failed to merge PR', {
    stderr: String(e.stderr || e.message),
    prNumber: prNum,
    method,
  });
}

// --- 3. Tear down worktree + branches ---------------------------------------
let worktreeRemoved = false;
let localBranchDeleted = false;
let remoteBranchDeleted = false;
if (!dryRun) {
  // Worktree removal (from primary). Try clean first, then force (everything is
  // committed and merged to main, so nothing unique remains).
  let rm = runAllowFail(primaryRoot, 'git', [
    'worktree',
    'remove',
    projectRoot,
  ]);
  if (!rm.ok) {
    const rmForce = runAllowFail(primaryRoot, 'git', [
      'worktree',
      'remove',
      '--force',
      projectRoot,
    ]);
    worktreeRemoved = rmForce.ok;
    if (!worktreeRemoved)
      fail('failed to remove worktree', {
        err: rmForce.err || rm.err,
        path: projectRoot,
      });
  } else {
    worktreeRemoved = true;
  }

  // Local branch (may already be gone).
  const localExists =
    runAllowFail(primaryRoot, 'git', ['branch', '--list', branch]).out ===
    branch;
  if (localExists) {
    const delLocal = runAllowFail(primaryRoot, 'git', ['branch', '-D', branch]);
    localBranchDeleted = delLocal.ok;
    if (!delLocal.ok)
      fail('failed to delete local branch', { err: delLocal.err, branch });
  }

  // Remote head branch (tolerate already-deleted).
  const remoteRef = runAllowFail(primaryRoot, 'git', [
    'ls-remote',
    '--heads',
    'origin',
    branch,
  ]);
  if (remoteRef.ok && remoteRef.out) {
    const delRemote = runAllowFail(primaryRoot, 'git', [
      'push',
      'origin',
      '--delete',
      branch,
    ]);
    remoteBranchDeleted = delRemote.ok; // non-fatal if GitHub already removed it
  }
}

// --- 4. Switch primary back to an up-to-date main ----------------------------
let primaryOnMain = false;
let primarySha = null;
if (!dryRun) {
  const curStatus = runAllowFail(primaryRoot, 'git', ['status', '--porcelain']);
  if (curStatus.ok && curStatus.out.length > 0) {
    fail(
      'primary checkout has uncommitted changes; refusing to switch branches',
      { files: curStatus.out.split('\n').slice(0, 20), primaryRoot },
    );
  }
  try {
    runPrimary('git', ['fetch', 'origin', 'main']);
    const curBranch = runAllowFail(primaryRoot, 'git', [
      'rev-parse',
      '--abbrev-ref',
      'HEAD',
    ]).out;
    if (curBranch !== 'main') runPrimary('git', ['checkout', 'main']);
    runPrimary('git', ['pull', '--ff-only', 'origin', 'main']);
    primaryOnMain = true;
    primarySha =
      runAllowFail(primaryRoot, 'git', ['rev-parse', 'HEAD']).out || null;
  } catch (e) {
    fail('failed to update primary main', {
      stderr: String(e.stderr || e.message),
      primaryRoot,
    });
  }
}

console.log(
  JSON.stringify(
    {
      prNumber: prNum,
      branch,
      storyId,
      statusBefore,
      statusAfter,
      committedDone,
      merged,
      alreadyMerged,
      worktreeRemoved,
      localBranchDeleted,
      remoteBranchDeleted,
      primaryOnMain,
      primarySha,
      dryRun,
    },
    null,
    2,
  ),
);
