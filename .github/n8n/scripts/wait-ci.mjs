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
// Stuck-run guard: if the Actions run for the tracked head sits in queued or
// pending longer than --max-queued-ms (default 600000), re-run it once; if it
// is still stuck after a second window, exit early with state=timeout plus
// run diagnostics instead of polling to the full timeout.
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
let maxQueuedMs = 600_000; // bail early if a run sits in queued/pending this long
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pr') prNum = Number(args[++i]);
  else if (args[i] === '--job') jobName = args[++i];
  else if (args[i] === '--repo') repoOverride = args[++i];
  else if (args[i] === '--timeout-ms') timeoutMs = Number(args[++i]);
  else if (args[i] === '--poll-ms') pollMs = Number(args[++i]);
  else if (args[i] === '--max-queued-ms') maxQueuedMs = Number(args[++i]);
  else {
    console.error(`Unknown argument: ${args[i]}`);
    console.error(
      'Usage: wait-ci.mjs --pr <num> [--job main] [--repo owner/name] [--timeout-ms N] [--poll-ms N] [--max-queued-ms N]',
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

// Best-effort: most recent Actions run for this head sha, or null.
function actionsRunForSha(sha) {
  try {
    const runs = ghApi(`actions/runs?head_sha=${sha}&per_page=5`);
    const list = (runs.workflow_runs || []).filter((r) => r.head_sha === sha);
    if (!list.length) return null;
    list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return list[0];
  } catch {
    return null; // non-fatal — the guard simply won't fire this poll
  }
}

// Best-effort: re-run a stuck Actions run in place (same run id, same head sha).
function rerunActionsRun(runId) {
  try {
    execFileSync(
      'gh',
      ['api', '-X POST', `repos/${REPO}/actions/runs/${runId}/rerun`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let trackedSha = headSha();
  let lastChecks = []; // last-seen check-runs, carried into the timeout report for diagnosis
  let lastRun = null; // last-seen Actions run, carried into the timeout report
  let stuckSince = null; // when the current run first observed in queued/pending
  const rerunTried = new Set(); // run ids already auto-rerun by this process
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
            runId: lastRun ? lastRun.id : null,
            rawChecks: lastChecks,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    const curHead = headSha();
    if (curHead !== trackedSha) {
      trackedSha = curHead; // new push restarted CI
      stuckSince = null; // fresh window for the new head's run
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

    // Stuck-run guard: bail early if the Actions run for this head sits in
    // queued/pending past maxQueuedMs (auto-rerun once first).
    const run = actionsRunForSha(trackedSha);
    if (!run) {
      stuckSince = null; // CI hasn't started a run for this head yet
    } else {
      lastRun = run;
      const stuck = run.status === 'queued' || run.status === 'pending';
      if (!stuck) {
        stuckSince = null; // progressing or done — clear the timer
      } else if (stuckSince === null) {
        stuckSince = Date.now();
      } else if (Date.now() - stuckSince >= maxQueuedMs) {
        if (!rerunTried.has(run.id)) {
          rerunTried.add(run.id);
          const ok = rerunActionsRun(run.id);
          console.error(
            `run ${run.id} stuck in "${run.status}" for ${Math.round((Date.now() - stuckSince) / 1000)}s — re-run ${ok ? 'requested' : 'failed'}; bailing if still stuck after another window`,
          );
          stuckSince = Date.now(); // fresh window post-rerun
        } else {
          console.log(
            JSON.stringify(
              {
                prNumber: prNum,
                headSha: trackedSha,
                jobName,
                state: 'timeout',
                conclusion: null,
                failedSteps: [],
                runId: run.id,
                rawChecks: lastChecks,
                stuckRun: {
                  id: run.id,
                  status: run.status,
                  url: run.html_url,
                  rerunTried: true,
                },
              },
              null,
              2,
            ),
          );
          process.exit(0);
        }
      }
    }

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
      job.conclusion === 'success' || job.conclusion === 'neutral' || job.conclusion === 'skipped';
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
          runId: lastRun ? lastRun.id : null,
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
