#!/usr/bin/env node
// Waits for the CI workflow's `main` job to finish on a PR's current head, then
// reports success or failure (with the failing step names). Run after pushing
// story changes (create-story-pr.mjs) — typically after the CodeRabbit loop is
// clean and before merging.
//
// Usage:
//   node .github/n8n/scripts/wait-ci.mjs --pr <num> [--job main] \
//     [--repo owner/name] [--timeout-ms 1800000] [--poll-ms 30000]
//
// Detection: the check-run on the PR head whose name equals --job (default
// "main", matching .github/workflows/ci.yml) reaches status=completed. Its
// conclusion decides success vs failure. If the head sha moves while waiting,
// re-track it (a new push restarts CI).
//
// On failure, best-effort extraction of failing step names via the Actions runs
// API is included so the fix node can target them without reading full logs.
//
// Prints a single JSON object to stdout:
//   {"prNumber": 43, "headSha": "...", "jobName": "main",
//    "state": "success"|"failure"|"timeout",
//    "conclusion": null|"<conclusion>",
//    "failedSteps":[{"job":"...","step":"..."}],
//    "runId": null|<id>, "rawChecks":[{...}]}
// Exit 0 = finished waiting (branch on `state`), 1 = operational error, 2 = usage.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
let prNum = null;
let jobName = 'main';
let repoOverride = null;
let timeoutMs = 1_800_000; // 30 min default (CI can be slow)
let pollMs = 30_000;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pr') prNum = Number(args[++i]);
  else if (args[i] === '--job') jobName = args[++i];
  else if (args[i] === '--repo') repoOverride = args[++i];
  else if (args[i] === '--timeout-ms') timeoutMs = Number(args[++i]);
  else if (args[i] === '--poll-ms') pollMs = Number(args[++i]);
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: wait-ci.mjs --pr <num> [--job main] [--repo owner/name] [--timeout-ms N] [--poll-ms N]',
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

function resolveRepo() {
  if (repoOverride) return repoOverride;
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim();
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

function checkRuns(sha) {
  const data = ghApi(`commits/${sha}/check-runs`);
  return (data.check_runs || []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
  }));
}

// Best-effort: find the Actions run for this head sha and list failing steps.
function failedStepsForSha(sha) {
  try {
    const runs = ghApi(`actions/runs?head_sha=${sha}&per_page=5`);
    const run = (runs.workflow_runs || []).find(
      (r) => r.head_sha === sha && r.status === 'completed',
    );
    if (!run) return [];
    const jobs = ghApi(`actions/runs/${run.id}/jobs?per_page=100`);
    const out = [];
    for (const j of jobs.jobs || []) {
      if (j.conclusion !== 'failure' && j.status !== 'failed') continue;
      for (const s of j.steps || []) {
        if (s.conclusion === 'failure' || s.status === 'failure')
          out.push({ job: j.name, step: s.name });
      }
    }
    return out;
  } catch {
    return []; // non-fatal — the fix node can fall back to reading logs itself
  }
}

async function main() {
  let trackedSha = headSha();
  let lastChecks = []; // last-seen check-runs, carried into the timeout report for diagnosis
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (Date.now() > deadline) {
      console.log(
        JSON.stringify(
          {
            prNumber: prNum,
            headSha: trackedSha,
            jobName,
            state: 'timeout',
            conclusion: null,
            failedSteps: [],
            runId: null,
            rawChecks: lastChecks,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    const curHead = headSha();
    if (curHead !== trackedSha) trackedSha = curHead; // new push restarted CI

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

    const job = checks.find((c) => c.name === jobName);
    if (!job) {
      await sleep(pollMs); // CI hasn't started this job yet on the new head
      continue;
    }

    if (job.status !== 'completed') {
      await sleep(pollMs);
      continue;
    }

    const success =
      job.conclusion === 'success' || job.conclusion === 'neutral';
    let failedSteps = [];
    if (!success) failedSteps = failedStepsForSha(trackedSha);

    console.log(
      JSON.stringify(
        {
          prNumber: prNum,
          headSha: trackedSha,
          jobName,
          state: success ? 'success' : 'failure',
          conclusion: job.conclusion,
          failedSteps,
          runId: null,
          rawChecks: checks,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
}

main().catch((e) =>
  fail('unexpected error', {
    message: String((e && e.message) || e),
    stderr: String((e && e.stderr) || ''),
  }),
);
