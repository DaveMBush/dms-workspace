#!/usr/bin/env node
// Waits for CodeRabbit to finish reviewing a PR, then reports whether it left
// actionable findings. Run after the story PR is open (create-story-pr.mjs).
//
// Usage:
//   node .github/n8n/scripts/wait-code-rabbit.mjs --pr <num> \
//     [--repo owner/name] [--timeout-ms 900000] [--poll-ms 30000]
//
// How "done" is detected (CodeRabbit's exact signal varies by config, so this
// checks both mechanisms and reports what it sees):
//   1. A check-run on the PR head whose name matches /code.?rabbit/i reaches
//      status=completed — authoritative; its conclusion decides clean vs issues.
//   2. Otherwise, a review posted by `code-rabbit[bot]` on the current head sha,
//      with the set of inline comments STABLE across two consecutive polls
//      (guards against acting while CodeRabbit is still posting).
//
// Actionable findings = PR review comments authored by `code-rabbit[bot]`.
// The fix node evaluates each and rejects non-actionable ones.
//
// Prints a single JSON object to stdout:
//   {"prNumber": 43, "headSha": "...", "state": "clean"|"issues"|"timeout",
//    "codeRabbitCheckName": null|"<name>", "actionableComments": [
//      {"id":1,"path":"src/x.ts","line":12,"body":"..."}],
//    "rawChecks":[{"name":"main","status":"completed","conclusion":"success"}, ...]}
// Exit 0 = finished waiting (state is clean/issues/timeout — branch on `state`),
//        1 = operational error (auth/API failure), 2 = usage error.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
let prNum = null;
let repoOverride = null;
let timeoutMs = 900_000; // 15 min default
let pollMs = 30_000; // 30 s default
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pr') prNum = Number(args[++i]);
  else if (args[i] === '--repo') repoOverride = args[++i];
  else if (args[i] === '--timeout-ms') timeoutMs = Number(args[++i]);
  else if (args[i] === '--poll-ms') pollMs = Number(args[++i]);
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: wait-code-rabbit.mjs --pr <num> [--repo owner/name] [--timeout-ms N] [--poll-ms N]',
    );
    process.exit(2);
  }
}

if (!prNum) {
  console.error('--pr <number> is required');
  process.exit(2);
}

function fail(msg, detail = {}) {
  console.log(JSON.stringify({ error: msg, ...detail }, null, 2));
  process.exit(1);
}

// Derive owner/name from the origin remote if not overridden.
function resolveRepo() {
  if (repoOverride) return repoOverride;
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim();
    // git@github.com:owner/name.git or https://github.com/owner/name(.git)
    const m = url.match(/[:/]([^:/]+\/[^/]+?)(\.git)?$/);
    if (m) return m[1];
  } catch {
    /* fall through */
  }
  fail('cannot determine repo; pass --repo owner/name');
}

const REPO = resolveRepo();

function ghApi(path) {
  const out = execFileSync('gh', ['api', `repos/${REPO}/${path}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headSha() {
  const out = execFileSync(
    'gh',
    ['pr', 'view', String(prNum), '--repo', REPO, '--json', 'headRefOid'],
    { encoding: 'utf8' },
  ).trim();
  return JSON.parse(out).headRefOid;
}

// Inline review comments authored by the CodeRabbit bot on this PR.
function codeRabbitComments() {
  const comments = ghApi(`pulls/${prNum}/comments`);
  return (Array.isArray(comments) ? comments : [])
    .filter((c) => c.user && /code.?rabbit/i.test(c.user.login))
    .map((c) => ({
      id: c.id,
      path: c.path || null,
      line: c.line ?? c.original_line ?? null,
      body: c.body || '',
    }));
}

// Check-runs on a given sha.
function checkRuns(sha) {
  const data = ghApi(`commits/${sha}/check-runs`);
  return (data.check_runs || []).map((c) => ({
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
  }));
}

// A code-rabbit[bot] review on the given head sha?
function hasCodeRabbitReview(sha) {
  const reviews = ghApi(`pulls/${prNum}/reviews`);
  return (Array.isArray(reviews) ? reviews : []).some(
    (r) => r.commit_id === sha && r.user && /code.?rabbit/i.test(r.user.login),
  );
}

const CR_NAME_RE = /code.?rabbit/i;

async function main() {
  const startHead = headSha();
  let trackedSha = startHead;
  let prevCommentsKey = null; // JSON key of last seen comment set (stability check)
  let lastChecks = []; // last-seen check-runs, carried into the timeout report for diagnosis
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (Date.now() > deadline) {
      console.log(
        JSON.stringify(
          {
            prNumber: prNum,
            headSha: trackedSha,
            state: 'timeout',
            codeRabbitCheckName: null,
            actionableComments: [],
            rawChecks: lastChecks,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    // If the PR head moved (a fix was pushed), re-track it and reset stability.
    const curHead = headSha();
    if (curHead !== trackedSha) {
      trackedSha = curHead;
      prevCommentsKey = null;
    }

    let checks;
    try {
      checks = checkRuns(trackedSha);
    } catch (e) {
      fail('failed to read check-runs', {
        stderr: String(e.stderr || e.message),
        sha: trackedSha,
      });
    }
    lastChecks = checks;

    const crCheck = checks.find((c) => CR_NAME_RE.test(c.name));

    // Path 1: authoritative CodeRabbit check-run completed.
    if (crCheck && crCheck.status === 'completed') {
      let comments = [];
      try {
        comments = codeRabbitComments();
      } catch {
        /* non-fatal */
      }
      const blocking = [
        'failure',
        'action_required',
        'error',
        'cancelled',
      ].includes(crCheck.conclusion);
      const state = blocking || comments.length > 0 ? 'issues' : 'clean';
      console.log(
        JSON.stringify(
          {
            prNumber: prNum,
            headSha: trackedSha,
            state,
            codeRabbitCheckName: crCheck.name,
            actionableComments: comments,
            rawChecks: checks,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    // Path 2: no check-run signal — fall back to a stable bot review + comments.
    let hasReview = false;
    try {
      hasReview = hasCodeRabbitReview(trackedSha);
    } catch {
      /* non-fatal */
    }

    if (hasReview) {
      let comments = [];
      try {
        comments = codeRabbitComments();
      } catch {
        /* non-fatal */
      }
      const key = JSON.stringify(comments.map((c) => [c.id, c.body]));
      if (prevCommentsKey !== null && prevCommentsKey === key) {
        // Stable across two polls -> CodeRabbit is done.
        const state = comments.length > 0 ? 'issues' : 'clean';
        console.log(
          JSON.stringify(
            {
              prNumber: prNum,
              headSha: trackedSha,
              state,
              codeRabbitCheckName: null,
              actionableComments: comments,
              rawChecks: checks,
            },
            null,
            2,
          ),
        );
        process.exit(0);
      }
      prevCommentsKey = key;
    }

    await sleep(pollMs);
  }
}

main().catch((e) =>
  fail('unexpected error', {
    message: String((e && e.message) || e),
    stderr: String((e && e.stderr) || ''),
  }),
);
