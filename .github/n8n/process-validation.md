# N8N Process Validation Report

**Date:** 2026-08-31 (fresh full re-validation; supersedes the 2026-08-30 report)
**Revised:** 2026-09-01 — C1 and H2 confirmed intended by design (no action); **H1 RESOLVED** (gate reverted to `dms-material-e2e`, CSV key renamed, verified); **H3 RESOLVED** (If4 rewritten: fixed → gate/review/PR, else retry loop, verified).
**Scope:** `DMS-DarkFactory.json` (`812K9Fn5YOA4HtR0`), sub-routines `DMS Validation Gate.json` (`pvsxLVSbUfOaN9Ad`), `DMS Electron Build, Lint, Test Validation.json` (`cyajXDFXKwu7HIlO`), `DupCheck.json` (`DEfJCPu2rlQomqGT`), separate process `DMS Create Epics & Stories.json`, variable datatable source `.github/n8n/data-tables/Variables.csv`, all 6 scripts in `.github/n8n/scripts/`, and all 6 instruction files in `.github/instructions/`.
**Method:** Full connections-map dump of every workflow, node-parameter inspection for every If/Switch/parser node, script CLI/exit-code/stdout-contract cross-checks against the nodes that invoke them, report-marker string comparison between instruction files and parser nodes, DataTable key reconciliation against the sub-routine lookup formulas, and nx-target verification in `apps/dms-material-e2e/project.json` / `package.json`.
**Constraint honored:** No N8N JSON files were modified. Every finding below states the exact current value and the proposed change so you can make each edit yourself.

## Findings summary

| ID  | Severity               | Area                                 | One-line description                                                                                                                              | Status (2026-09-01)                                                                                                                                                                                                                            |
| --- | ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | CRITICAL → INTENDED    | Validation Gate                      | `If1` true branch is empty — full validation success returns zero items; main workflow silently stops instead of continuing to Code Review        | **Intended by design** (owner-confirmed) — no action                                                                                                                                                                                           |
| H1  | HIGH → RESOLVED        | Electron sub-routine + Variables.csv | e2e-chromium prompt key mismatch — fix path sends the literal string `"undefined"` as the qwen prompt                                             | **Fixed by owner (2026-09-01).** Gate reverted to `Project: "dms-material-e2e"`; CSV key renamed to `fix-dms-material-dms-material-e2e-e2e-chromium-prompt`. Verified: command valid, lookup matches.                                                                                          |
| H2  | HIGH → INTENDED        | DarkFactory `If6`                    | Object "exists" operator on `$json.nextStory` plus empty false branch — a completed epic routes to `--story null` and errors instead of advancing | **Intended by design** (owner-confirmed) — no action                                                                                                                                                                                           |
| H3  | HIGH → RESOLVED        | DarkFactory `If4` routing            | CodeRabbit fixes go straight to Wait For CI with no commit/push — unreviewed, unvalidated changes get swept into the squash merge at merge time   | **Fixed by owner (2026-09-01).** If4 now: true (`result == "fixed"`) → gate → review → PR; false → loop back to Fix CodeRabbit Issues. Verified in JSON.                                                                                       |
| L1  | LOW                    | Electron sub-routine + DupCheck      | Terminal `{result:'pass'}` / `{result:'fixed'}` code nodes have no outgoing connections (harmless dead ends)                                      |
| L2  | LOW                    | Variables.csv                        | UTF-8 BOM (`EF BB BF`) before `key,value` — verify the DataTable import stripped it                                                               |
| L3  | LOW                    | DarkFactory PR/CodeRabbit parsers    | No null guard on `prNumber` → `--pr null` in edge cases                                                                                           |
| L4  | LOW                    | execute-story.md                     | Documents paired unit-test story at `Status: skip` — stale vs current ready-for-dev + `.skip()` convention                                        |
| L5  | COSMETIC               | Node naming                          | "CoPilot fix …" SSH nodes actually run the `qwen` CLI                                                                                             |
| L6  | COSMETIC               | Electron sub-routine form            | Dropdown label `dms-material:chromium` vs automated Executor value `e2e-chromium` (do NOT change the Executor value)                              |
| L7  | LOW                    | DarkFactory `Parse Epic`             | Script failure and "no more epics" both degrade to `nextEpic: ''` — transient SSH errors silently end the run                                     |

Accepted-by-design items (N1–N3) and verified-OK sections follow; no action requested on those.

---

## CRITICAL

### C1 — Validation Gate returns nothing on full success → main workflow silently stops

**STATUS (2026-09-01): INTENDED BY DESIGN — owner confirmed. No action.** The empty true branch is deliberate; the run stopping after a clean gate pass is expected behavior in this setup. Retained below for reference only.

**Where:** `sub-routines/DMS Validation Gate.json`, node `If1` (the dupcheck pass/fail check, last step of the gate).
**Current state (verified programmatically):**

- `If1` params: `$json.result == "pass"` (string equals), out0 = TRUE branch.
- Connections for `If1`: **out0 is an empty array (`[]`) — no node connected.** Only out1 (false) connects, looping back to `pnpm format`.
  **Why it breaks:** When all 12 gate steps pass (format → build/test/lint ×4 projects → e2e lint → e2e chromium → dupcheck), the sub-workflow's final executed node emits zero items. The Execute Workflow call in the main workflow therefore returns **zero items**, and every downstream node (`Code Review` and everything after) receives no input — the run terminates silently right after "Call 'DMS Validation Gate'". This affects **all three entry points** into the gate:

1. `If1` (main) true branch — story developed to `review`, first gate pass;
2. `If4` true branch — CodeRabbit fix reported not-fixed/blocked, re-gate;
3. `If5` true branch — CI fix reported fixed, re-gate.

In practice the pipeline can never reach Code Review / PR creation / merge via a clean gate pass. (It only "works" today if you manually continue or if a step keeps failing and you intervene.)
**Proposed change:** Add one terminal node to `If1`'s true branch — e.g. a Code node named `All Passed` with:

```js
return [{ json: { result: 'all-pass', cwd: $('CWD').first().json.cwd } }];
```

No other gate changes needed; the main workflow's single Execute Workflow output already flows into `Code Review`.

---

## HIGH

### H1 — e2e-chromium prompt key mismatch → qwen receives `"undefined"` as its prompt

**STATUS (2026-09-01): RESOLVED by owner.** Option A applied: gate node `e2e:chromium` sends `Project: "dms-material-e2e"`, `Executor: "e2e-chromium"` and the CSV key was renamed to `fix-dms-material-dms-material-e2e-e2e-chromium-prompt`. Verified against current files on 2026-09-01:
- Command built by sub-routine: `pnpm nx run dms-material-e2e:e2e-chromium` — valid target (confirmed in `apps/dms-material-e2e/project.json`).
- Lookup formula yields `fix-dms-material-dms-material-e2e-e2e-chromium-prompt` — present in `Variables.csv`.
- All other 10 prompt keys still match their gate combos.

Note: an intermediate attempt (changing the gate's Project to `dms-material`) fixed the key lookup but produced the invalid target `dms-material:e2e-chromium`; it was reverted before this final state. Original analysis retained below for reference.

**Where:** `sub-routines/DMS Electron Build, Lint, Test Validation.json`, node `Reduce to Record` (the fix-path variable lookup), and `.github/n8n/data-tables/Variables.csv`.
**Current state:**

- Lookup formula: `'fix-dms-material-' + project + '-' + executor + '-prompt'` where the gate calls this sub-workflow with `Project = "dms-material-e2e"`, `Executor = "e2e-chromium"` (gate node `11.e2e:chromium`).
- Formula yields expected key: **`fix-dms-material-dms-material-e2e-e2e-chromium-prompt`**.
- Actual CSV key: **`fix-dms-material-dms-material-e2e-chromium-prompt`** (verified byte-for-byte; all other 10 prompt keys match their gate combos exactly).
- Result: `promptVal` is `undefined`, and the fix SSH node runs `qwen -p "undefined" --model …`. The e2e-chromium failure can never be auto-fixed.
  **Proposed change (pick one, option A recommended):**
- **A.** In `Variables.csv`, rename the key `fix-dms-material-dms-material-e2e-chromium-prompt` → `fix-dms-material-dms-material-e2e-e2e-chromium-prompt`, then re-import/update the DataTable row. (The prompt _value_ already references `pnpm e2e:dms-material:chromium`, which maps to the same nx target — no value change needed.)
- **B.** Change the gate's Executor value from `e2e-chromium` to `chromium`. **Not recommended:** the sub-workflow builds its command as `pnpm nx run {{ Project }}:{{ Executor }}`, and `dms-material-e2e:chromium` is not a valid target (valid targets confirmed in `apps/dms-material-e2e/project.json`: `e2e`, `e2e-chromium`, `e2e-firefox`, `e2e-electron`, `e2e-electron-smoke`, `e2e-ui`). Option B would break the command itself.

### H2 — `If6` (next-story check) uses "exists" and has an empty false branch

**STATUS (2026-09-01): INTENDED BY DESIGN — owner confirmed. No action.** Retained below for reference only.

**Where:** `DMS-DarkFactory.json`, node `If6` (after `Parse Story`).
**Current state (verified):**

- Condition: leftValue `={{ $json.nextStory }}`, operator **object / exists**.
- out0 (true) → `Create Story & Worktree`; **out1 (false) is empty — no connection to `Find Next Epic`.**
  **Why it breaks:** `report-next-story.mjs` prints `{"nextStory": null}` when an epic's stories are all complete. For a JSON object with key `nextStory: null`, the "exists" operator evaluates **true** (the key exists). So on a completed epic the flow goes to `Create Story & Worktree` → `create-story-issue.mjs --story null` → usage error (exit 2) → `Parse Worktree Location` throws (`There was a problem creating story and worktree`) → the run errors out instead of advancing to the next epic. The empty false branch means even a correct "no story" signal would stop the whole run rather than continue the epic loop.
  **Proposed change:**

1. Change `If6`'s operator from object/exists to **string notEmpty** (leftValue stays `={{ $json.nextStory }}`; note that with a null value n8n renders it as empty for string comparison — if you prefer, switch leftValue to `={{ JSON.stringify($json.nextStory) }}` and test against `"null"`, or add a guard in `Parse Story`: `return { nextStory: parsed.nextStory ?? '' }`).
2. Connect **out1 (false) → `Find Next Epic`** so completed epics advance the outer loop instead of dying.

### H3 — CodeRabbit fixes reach Wait For CI uncommitted; they get merged without ever being validated or re-reviewed

**STATUS (2026-09-01): RESOLVED by owner.** `If4` was rewritten: condition is now `$json.result equals "fixed"` with out0 (true) → Call 'DMS Validation Gate' and out1 (false) → **Fix CodeRabbit Issues** (retry loop). Verified in current JSON. New routing:

| `Parse CodeRabbit Report` result  | `If4` condition `$json.result equals "fixed"` | Route                                                                                                                                                                                         |
| --------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixed`                           | TRUE (out0)                                   | Call 'DMS Validation Gate' → Code Review → If2/If3 → **Create Pull Request** (`create-story-pr.mjs` commits + pushes dirty worktree) — fixes are re-validated and re-reviewed before commit ✓ |
| `not-fixed` / `blocked` / `error` | FALSE (out1)                                  | Loop back to **Fix CodeRabbit Issues** → Parse CodeRabbit Report → If4 (unbounded retry, consistent with N1 design)                                                                           |

No path from the CR-fix stage reaches Wait For CI without first passing gate + review + PR commit. Original analysis retained below for reference.

**Where:** `DMS-DarkFactory.json`, path `If4` false branch (i.e. `result == "fixed"` after `Fix CodeRabbit Issues`).
**Current state (verified):** `If4` params: `$json.result notEquals "fixed"`. out0 (true) → Call 'DMS Validation Gate'; **out1 (false, i.e. fixed) → `Wait For CI` directly.** No commit/push node exists between them.
**Why it breaks:** `fix-code-rabbit-findings.md` explicitly leaves changes **uncommitted** and forbids git mutations ("Version control of your changes is handled by the pipeline after this run" — but on this path, nothing in the pipeline commits them). `wait-ci.mjs` tracks the PR's **head sha**, which is still the pre-fix commit. Consequences:

- CI validates the old code (the CR fixes are invisible to it);
- CodeRabbit never re-reviews the fix;
- later, `merge-story-pr.mjs` runs `git add -A` + commit "chore(story …): mark done" in the worktree — **sweeping the uncommitted CR fixes into the squash merge**. Unreviewed, CI-unvalidated code lands on main.

(Contrast with the `If5`-true path after CI fixes: that one re-enters gate → Code Review → `Create Pull Request`, and `create-story-pr.mjs`'s idempotent commit/push does push those changes before CI waits — so only this CR-fix path has the gap.)
**Proposed change:** Insert a commit+push step between `If4` out1 (false) and `Wait For CI`. Simplest option reusing existing machinery: an SSH node running

```
node .github/n8n/scripts/create-story-pr.mjs --story {{ $('Parse Story').item.json.nextStory.id }}
```

with cwd = worktree path (`$('Parse Worktree Location').item.json.worktreePath`). The script is idempotent (commit all changes, push, open-or-reuse PR), so it safely pushes the CR fixes and returns the same `prNumber`. Optionally follow with a re-run of `Wait for CodeRabbit` before `Wait For CI` if you want CodeRabbit to sign off on the fix too.

---

## LOW

### L1 — Sub-routine terminal nodes are dead ends (harmless)

In both `DMS Electron Build, Lint, Test Validation.json` and `DupCheck.json`, the code nodes returning `{result: 'pass'}` (`Code in JavaScript`) and `{result: 'fixed'}` (`Code in JavaScript1`) have **no outgoing connections**. This is harmless: an Execute Workflow sub-call returns the items of the last executed node, so the gate's If nodes do receive `result`. No change required; noted so a future editor doesn't "fix" these by wiring them somewhere wrong.

### L2 — Variables.csv starts with a UTF-8 BOM

Verified via byte dump: file begins `EF BB BF` before `key,value`. If the n8n DataTable import preserved it literally, the first column header is `\ufeffkey` and **every** `j.json['key'] === …` lookup in all four workflows breaks. Check the DataTable UI: if the key column shows a stray character or lookups fail, re-import without BOM (or clear/retype the header cell). If imports already stripped it, no action needed.

### L3 — No null guard on `prNumber`

`Parse PR Return` and `Parse CodeRabbit Return` both do `{ ...JSON.parse(item.stdout), exitCode: item.code }` with no check that `prNumber` is non-null (the script can emit `null` in dry-run/reuse edge cases). Downstream, `Wait for CodeRabbit` would receive `--pr null` → usage error. Defensive option: in both parser nodes, add `if (!parsed.prNumber) throw new Error('no prNumber returned');`.

### L4 — execute-story.md documents stale `Status: skip` convention

The instruction file's Inputs table and Status Rules still describe the paired unit-test story as having status `skip`, but current generation (per `generate-epics-and-stories.md` and `validate-epics-and-stories.mjs`) keeps all triple members at `ready-for-dev` with red-phase via in-code `.skip()` markers. Harmless legacy text; update the doc if you want it accurate.

### L5 — "CoPilot fix …" node names run qwen

The SSH nodes named `CoPilot fix …` (Electron sub-routine, DupCheck) execute the `qwen` CLI, not Copilot. Rename for clarity if desired; no functional impact.

### L6 — Form dropdown label vs automated Executor value

The Electron sub-routine's manual form offers Executor label `dms-material:chromium`, while the gate's automated path uses `e2e-chromium`. Cosmetic only — **do not change the gate's Executor value** (see H1 option B warning); if you want consistency, rename the _form label_ to match reality.

### L7 — `Parse Epic` conflates script failure with "no more epics"

`Parse Epic` returns `{ nextEpic: '' }` both when `report-incomplete-epics.mjs` exits non-zero (SSH/operational error) and when there genuinely are no incomplete epics. Either way the run stops at the empty `If` out1 branch — a transient SSH failure silently ends the whole factory run with no signal. Optional hardening: throw on `code !== 0` (like `Parse Story` does) so real errors surface as failed runs instead of quiet stops.

---

## NOTE / ACCEPTED BY DESIGN (no action requested)

- **N1 — Unbounded retry loops.** Gate false branches loop back to `pnpm format`; the Electron sub-routine and DupCheck fix loops re-run forever on repeated failure; `If3` false → `Fix Review Issues`; CodeRabbit timeout (`Switch` out2) → `Wait for CodeRabbit`; CI timeout/error (out2/out3) → `Wait For CI`. Previously confirmed as intentional unattended design.
- **N2 — No escalation path for `blocked` / `needs-human` verdicts.** A blocked fix prints its marker with a non-fixed result, which routes back through gate/review or re-waits CI indefinitely. Consistent with N1; if you ever want a safety valve, add a retry counter + notification node on those loops.
- **N3 — Intentional empty branches.** `If` out1 (no next epic → stop), gate `If1` true branch on full pass (C1, owner-confirmed intended), and `If6` false branch (H2, owner-confirmed intended) are all deliberate. No unintended empty branches remain in the main workflow.

---

## VERIFIED OK (checked, no action needed)

- **Report markers:** all five DF2 instruction files emit exactly the markers their parser nodes expect — `=== DF2 FINAL REPORT ===`, `=== DF2 REVIEW REPORT ===`, `=== DF2 FIX REPORT ===` (presence-only check), `=== DF2 CR FIX REPORT ===` (regex `/=== DF2 CR FIX REPORT ===\s*([\s\S]*)$/`), `=== DF2 CI FIX REPORT ===`. JSON field shapes in the docs match what parsers read.
- **Script contracts:** all 6 scripts' CLI args, exit codes (0 success / 1 operational / 2 usage; wait-scripts use 0 = "finished waiting" and branch on `state`), and stdout JSON fields match every N8N node that invokes them. `merge-story-pr.mjs` with no arguments is valid by design (all params optional). `wait-ci.mjs` state values (`success|failure|timeout`) plus the parser's `"error"` fallback (from its `JSON.parse` catch) exactly cover the CI Switch's four outputs; same for CodeRabbit (`clean|issues|timeout`).
- **Epics & Stories process:** form → qwen generate → base64 → `validate-epics-and-stories.mjs --stdin`; exit 0/1/2 maps correctly to the Switch (complete / retry loop with retry text / error). Retry loop re-reads variables and re-invokes generation — correct.
- **DataTable references:** all four workflows reference datatable id `jnt5XOd12A83mA01` ("Variables") consistently; 10 of 11 prompt keys match the sub-routine lookup formula exactly (the one mismatch is H1).
- **e2e target existence:** `dms-material-e2e:e2e-chromium` confirmed as a real nx target (`apps/dms-material-e2e/project.json`), and `package.json`'s `pnpm e2e:dms-material:chromium` maps to the same target — so both the sub-workflow command and the CSV prompt text are valid.
- **Main workflow error handling:** `Parse Story` throws on script failure; `Parse Worktree Location` throws; `Parse Story Return` / `Parse Review Return` degrade to `'error'`/`'fail-rework'`-equivalent states that route into the fix loops or next-epic path as intended.
- **Connections map:** fully dumped and traced for all four workflows; every node accounted for except the items listed above (C1, H2, L1).
