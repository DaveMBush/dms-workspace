# Dark Factory 2 — Observability Recommendations

Recommendations only. No workflow files have been modified. Each item says
**where**, **what to change**, and **why**, so you can make the edits yourself
and we can discuss trade-offs first.

Files covered:

- `DMS-DarkFactory.json` (top-level pipeline)
- `sub-routines/DMS Validation Gate.json` (10 checks + DupCheck, retry loop)
- `sub-routines/DMS Electron Build, Lint, Test Validation.json` (generic check runner)
- `sub-routines/DupCheck.json`
- `scripts/wait-ci.mjs`, `scripts/wait-code-rabbit.mjs` (optional script tweaks)

---

## 1. Why sub-workflows are opaque in n8n (the root cause)

When a workflow calls another via an **Execute Workflow** node, the child runs
as its **own separate execution**. In the parent's execution view you only ever
see the Execute Workflow node itself as "running" — nothing about which internal
node of the child is active. n8n has no built-in mechanism to stream a child's
progress into the parent's UI. This is a platform limitation, not a misconfiguration.

Your pipeline nests **two levels deep**:

```
DMS-DarkFactory
└── DMS Validation Gate            (Execute Workflow node: "Call 'DMS Validation Gate'")
    ├── DMS Electron Build, Lint, Test Validation   (×10 calls)
    └── DupCheck                    (×1 call)
```

So during a validation gate run you are looking at a parent execution where one
node is "running", and the actual work is happening in up to two child executions
that you have to find separately.

### What n8n already gives you (no changes needed)

- **Execution History lists child executions as separate entries.** Each sub-run
  appears with its own workflow name ("DMS Validation Gate", "DupCheck", etc.)
  and is linked back to the parent execution. While a gate run is in progress,
  filter Execution History by those workflow names — you will see the current
  child execution, and opening it shows exactly which node inside it is running
  (e.g., `pnpm nx run server:build` vs `CoPilot fix server:build`). This works
  today; the cost is that you must know to look there.
- **Deep links**: an execution URL (`/workflow/{id}/executions/{executionId}`)
  can be bookmarked/shared, which matters once error notifications exist (see §3).

The rest of this document reduces how often you need to hunt for child executions
and what you see when you do.

---

## 2. Workflow settings changes (all four workflow files)

In each workflow: **Settings → Workflow Settings** (the `settings` block in the
JSON currently contains only `executionOrder`, `binaryMode`, `availableInMCP`).

### 2a. Enable "Save Execution Progress" — highest value, zero node work

- **Where:** all four workflows (`DMS-DarkFactory.json`, `DMS Validation Gate.json`,
  `DMS Electron Build, Lint, Test Validation.json`, `DupCheck.json`)
- **What:** enable *Save Execution Progress* (in JSON: `"saveExecutionProgress": true`
  inside `settings`).
- **Why:** n8n persists execution data after **each node completes** instead of
  only at the end. Consequences:
  - The running-execution view and the REST API reflect the *current* node mid-run,
    so you can poll or open a long run (a 20-minute qwen SSH node) and see every
    node that has already finished plus which one is active — including inside child executions.
  - If n8n restarts/crashes mid-pipeline, the execution state survives instead of being lost.

### 2b. Set an execution timeout (safety net)

- **Where:** all four workflows.
- **What:** set *Execution Timeout* to something generous but finite — e.g. 4–6 hours
  for `DMS-DarkFactory` (it loops over stories), ~1 hour per gate run for the sub-routines.
- **Why:** every long SSH node (`qwen -p ...`, `wait-ci.mjs`, `wait-code-rabbit.mjs`)
  has no command-level timeout, and all nodes use `onError: continueRegularOutput`.
  A hung qwen process or a stuck poll currently blocks the pipeline forever with no
  signal. A workflow-level timeout converts "silent hang" into a visible failed execution
  (which then triggers the error workflow from §3).

### 2c. Keep execution data around

- **Where:** n8n instance settings (not per-workflow): *Save successful executions* /
  *Save failed executions* and their retention period.
- **Why:** with a multi-hour pipeline you will want to inspect yesterday's run. If the
  default retention is short, bump it (e.g., keep all for 7–30 days).

---

## 3. Error workflow + notifications (new small workflow)

Today nothing tells you a run failed or stalled — you find out by looking, or not at all.

- **What:** create one new workflow, e.g. **"DF2 Error Handler"**:
  - Node 1: **Error Trigger** (`n8n-nodes-base.errorTrigger`). Its output includes the
    failing node name, workflow name, execution ID, and error message.
  - Node 2 (optional): a Code node that assembles a compact message:
      `workflow`, `failedNode`, `executionId`, deep link to the execution, error text.
  - Node 3: your notification channel of choice — Slack/MS Teams/Discord webhook, email,
    or n8n's built-in **Send Email** node. (Pick whatever you already use; this doc is
    channel-agnostic.)
- **Where:** then set *Error Workflow* = "DF2 Error Handler" in the Settings of all four
  existing workflows (JSON: `"settings": { ..., "errorWorkflow": "<id>" }`).
- **Why / caveats:**
  - This fires when a node throws. Because your nodes use `onError: continueRegularOutput`,
    most SSH failures are *swallowed* and handled by If branches — the error workflow will
    NOT fire for those. It catches the rest: credential errors, n8n crashes mid-node,
    timeouts from §2b, dataTable failures, etc.
  - Sub-workflow errors propagate to the parent's Execute Workflow node, so one handler
    covers all levels; you may get both a child and a parent notification for the same root
    cause — acceptable noise for now, dedupe later if it bothers you.
- **Complementary idea (optional):** an n8n **Schedule Trigger** workflow that every N minutes
  queries the REST API (`GET /api/v1/executions?status=running`) and alerts if a DarkFactory
  execution has been running longer than X hours. This catches "stuck but not failed" states
  that even a timeout won't surface until it fires.

---

## 4. Heartbeat / status-file pattern for long SSH nodes (biggest UX win)

The opaque parts of your pipeline are the long SSH nodes: `Develop Story`,
`Code Review`, all `Fix *` qwen runs, `Wait for CodeRabbit` (up to 30 min),
`Wait For CI` (up to 30 min). An n8n node shows nothing until it completes.

**Pattern:** make each long command append timestamped markers to a known log file on the
build server. No new nodes needed — one-line edits to existing SSH node commands.

- **Where:** every long-running SSH node in `DMS-DarkFactory.json` and the sub-routines:
  - `Develop Story`, `Code Review`, `Fix Review Issues`, `Fix CodeRabbit Issues`, `Fix CI Fails`
  - `Wait for CodeRabbit`, `Wait For CI`
  - `CoPilot fix {{Project}}:{{Executor}}` (in the check-runner sub-workflow) and
    `CoPilot fix DupCheck`
- **What:** wrap the command, e.g. for `Develop Story`:

  ```bash
  echo "[$(date -Is)] START Develop Story story={{...}}" >> /tmp/df2-status.log && qwen -p ... ; rc=$?; echo "[$(date -Is)] END Develop Story rc=$rc" >> /tmp/df2-status.log; exit $rc
  ```

  (Adapt to your exact command strings; the point is START before, END+exit-code after,
  same file. Use a path that survives reboots if you want history, e.g. under the repo or
  `/var/log/df2-status.log`.)
- **Why:** `tail -f /tmp/df2-status.log` on the server (or via SSH from anywhere) gives you
  a live "what is Dark Factory doing right now" view that works across all nesting levels,
  survives n8n UI limitations, and leaves an audit trail of every phase transition with
  timestamps. It also makes it trivial to see *which* check's qwen fix was running when the
  Validation Gate loop restarted everything (§5).
- **Note:** this does not change node output or any downstream parsing — markers go to a
  file, stdout stays exactly what your Parse nodes expect.

---

## 5. DMS Validation Gate: iteration counter + max-iteration guard + per-check log

Current behavior (confirmed in the JSON): all eleven If nodes' false branches connect back
to `pnpm format`. Any single check failure — even a late one like `e2e:chromium` — restarts
the **entire** sequence from formatting, with no record of which check failed or how many
times. Two problems:

1. You cannot tell what the loop is doing on its Nth pass (compounds §1's opacity).
2. There is no exit condition if a fix never converges — the loop can spin indefinitely
   (each pass re-running all 10 checks + dupcheck, each with a qwen fix attempt).

Recommended changes to `sub-routines/DMS Validation Gate.json`:

### 5a. Iteration counter node

- **What:** add one Code node between `pnpm format` and the first check's parameters node
  (e.g., name it `Gate Iteration`). It increments a per-run counter using workflow static
  data, keyed by something unique to this pipeline run (the cwd or story id from the CWD
  node works):

  ```js
  const sd = $getWorkflowStaticData('node');
  const key = 'gateIter_' + $('CWD').first().json.cwd;
  sd[key] = (sd[key] || 0) + 1;
  return { ...$input.first().json, iteration: sd[key] };
  ```

  And in the `CWD` node (which runs once at gate entry), reset it first:
  `$getWorkflowStaticData('node')['gateIter_' + cwd] = 0;` before returning.
- **Why:** every loop pass now carries an `iteration` number that you can log (§4 heartbeat,
  §6 richer returns) and branch on (5b).

### 5b. Max-iteration guard

- **What:** add an If node after `Gate Iteration`: if `iteration > N` (suggest 3), route to a
  new terminal Code node returning `{ result: 'fail', reason: 'validation gate exceeded max iterations' }`
  instead of continuing the checks. Wire that as the gate's failure output back to DarkFactory.
- **Why:** converts an infinite loop into a bounded, reported failure. Pick N after you see
  real data — with §4/§6 in place you'll know how many passes fixes actually need.

### 5c. Per-check result log (append-only)

- **What:** at each check's If node outcome, append one line to the status file (§4), e.g. via
  a tiny SSH command or by extending the existing pattern:
  `echo "[$(date -Is)] gate iter={{$json.iteration}} server:build pass" >> /tmp/df2-status.log`
  Simplest placement: one Code node per check is overkill — instead, have the *check-runner*
  sub-workflow itself write its result line (§6), so you get this for free at every level.
- **Why:** after a full restart you can see exactly which checks passed before the failure and
  on which iteration, without digging through eleven child executions.

### 5d. (Discussion item) Fail-fast vs full-restart

The full-restart-from-format design is defensible (formatting can change anything; a later
check's qwen fix may touch earlier projects' files). But it is expensive: a failure on check
10 re-runs checks 1–9. Alternatives to consider, in order of invasiveness:

- Keep full restart but make it visible and bounded (§5a/5b) — **recommended first step**.
- Restart only from the failed check (drop the back-edge to `pnpm format`, point false branches
  at a "re-run from here" variant). Risky if fixes cross project boundaries; needs your domain judgment.
- Run checks in dependency order with per-project restarts only.

---

## 6. Richer return objects from sub-workflows

Currently the check-runner and DupCheck return bare `{ result: 'pass' | 'fixed' }`. The parent
gate (and DarkFactory) therefore cannot say *what* was checked, how many attempts it took, or
why it failed — you must open each child execution to find out.

### 6a. `DMS Electron Build, Lint, Test Validation.json`

- **What:** in the three terminal Code nodes (`Code in JavaScript` = pass, `Code in JavaScript1`
  = fixed, and add one for the still-failing path if you want it explicit), return context:

  ```js
  // pass
  return { result: 'pass', check: $('Code in JavaScript2').first().json.combine };
  // fixed (after re-run)
  return { result: 'fixed', check: $('Code in JavaScript2').first().json.combine, attempts: 1 };
  ```

  `combine` is already computed (`project + ':' + executor`) — it's just not returned today.
- **Why:** the gate's If nodes and any log line can now name the exact check
  (`server:test`, `electron:lint`, ...) without a child-execution lookup.

### 6b. Same for `DupCheck.json`

- Return `{ result: 'pass' | 'fixed', check: 'dupcheck' }`.

### 6c. Capture failure context (optional, higher value)

- **What:** on the failing re-run path, include a tail of the command output in the returned
  object, e.g. `lastOutputTail: $json.stdErr.slice(-2000)` (the SSH node exposes stdout/stderr;
  trim to keep execution data small).
- **Why:** "electron:test failed" is actionable only with the error text. Today that text lives
  in a child execution's node output — one more click per failure. With this, DarkFactory's fix
  nodes and your notifications can carry the actual failure reason.

### 6d. Gate-level summary (optional)

- If you want DarkFactory to see the whole gate outcome at once: accumulate results in static
  data keyed by run (§5a key), appending `{check, result, iteration}` per check, and have the
  gate's final node return the accumulated array alongside `result`. This is more work; do it
  only if §4/§6a don't give you enough.

---

## 7. Script-level tweaks (optional)

`wait-ci.mjs` and `wait-code-rabbit.mjs` poll silently for up to 30 minutes, printing a single
JSON object at the end. Two optional improvements:

- **Progress to stderr:** emit one line per poll to *stderr* only
  (`console.error(\`[wait-ci] poll #${n} head=${sha.slice(0,7)} state=...\`)`). Stdout stays
  pure JSON, so your Parse nodes are unaffected; the lines appear in n8n's node output after
  completion and in any log capture. Low value for *live* visibility (you still can't see a
  running SSH node's output) — do this only if post-hoc "what was it doing" matters more than
  live status (§4 covers the live case).
- **Status-file markers:** same pattern as §4, from inside the script
  (`fs.appendFileSync('/tmp/df2-status.log', ...)` each poll or on state change). This is what
  actually makes a 30-minute wait observable live.

---

## 8. Suggested order of work (by value/effort)

| # | Change | Effort | Effect |
|---|--------|--------|--------|
| 1 | §2a Save Execution Progress (4 workflows) | minutes | Live node-level visibility in UI/API for every run, all nesting levels |
| 2 | §3 Error workflow + notifications | ~1 hr | You find out about failures without looking |
| 3 | §4 Status-file heartbeats on long SSH nodes | ~1 hr (one-line command edits) | `tail -f` = live pipeline state, audit trail |
| 4 | §5a/5b Gate iteration counter + max-iteration guard | ~1 hr | Bounded gate loop; know which pass you're on |
| 5 | §6a/6b Richer sub-workflow returns | ~30 min | Check names in parent context, no child-execution hunting |
| 6 | §2b Execution timeouts | minutes | Hung runs become visible failures |
| 7 | §6c Failure output tails | ~30 min | Actual error text travels with the result |
| 8 | §5d Fail-fast redesign | discussion first | Cheaper retries, if safe for your codebase |
| 9 | §7 Script progress lines | optional | Post-hoc poll detail |

Items 1–4 together address the core complaint ("can't see what node is running") with no
architectural change: item 1 shows it in n8n itself, item 3 shows it from anywhere via a log
file, and items 2/4 make sure you're never waiting on something that silently died or looped.

---

## Appendix: current-state facts these recommendations rely on

- All four workflows' `settings` blocks contain only `executionOrder`, `binaryMode`,
  `availableInMCP` — no `errorWorkflow`, no `saveExecutionProgress`, no timeout.
- No workflow contains an Error Trigger node; none is configured as another's error workflow.
- Every SSH node in all workflows uses `"onError": "continueRegularOutput"`.
- Validation Gate: 10 × (parameters → Execute Workflow → If) + DupCheck, all eleven false
  branches reconnect to `pnpm format`; no counter or terminal failure path exists.
- Check-runner sub-workflow returns only `{result:'pass'}` / `{result:'fixed'}`; the computed
  `combine` (`project:executor`) is available in `Code in JavaScript2` but not returned.
- `wait-ci.mjs` / `wait-code-rabbit.mjs`: single JSON object on stdout at completion, no
  interim output, default timeout 30 min, poll interval 30 s.
