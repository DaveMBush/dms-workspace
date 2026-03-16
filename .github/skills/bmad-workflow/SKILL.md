---
name: bmad-workflow
description: Common rules and patterns for BMAD (Business-Model-Agile-Development) autonomous workflows. ALWAYS USE when running any BMAD prompt (develop-story, debug, develop-epic, code-rabbit). Governs human interaction via prompt.sh, database safety, MCP server usage, quality validation loops, CodeRabbit review, and error recovery.
---

# BMAD Workflow Common Rules

Shared rules for all BMAD autonomous development workflows.

## CRITICAL: Never Output to Chat — Always Use prompt.sh

**You MUST call `prompt.sh` via `run_in_terminal` for ALL human interaction.**
**NEVER write questions, status requests, or "awaiting your input" messages to the chat window.**

This rule applies for the ENTIRE workflow, including after many iterations and loop cycles.

```typescript
run_in_terminal({
  command: 'bash .github/prompts/prompt.sh "Your message here"',
  isBackground: false,
  timeout: 0, // CRITICAL: No timeout — wait indefinitely
});
```

See [Human Interaction Protocol](./references/human-interaction.md) for full details, return value handling, and exit code 130 retry logic.

## CRITICAL: Subagent Continuation Rule

When a `run #file:` or `#skill:` subagent returns, **IMMEDIATELY continue to the next step** — no pausing, no asking for confirmation.

The ONLY exceptions:

- Subagent explicitly called `prompt.sh` with `"stop"` in its output
- Subagent called `prompt.sh` and you are waiting for the user response

## CRITICAL: Database Safety

**NEVER run destructive database commands** without explicit human approval via `prompt.sh`.

See [Database Safety](./references/database-safety.md) for the full list of forbidden commands.

## Reference Files

Load these on demand — they are **not** loaded automatically:

| Topic                                        | File                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Human Interaction Protocol + Exit Code 130   | [references/human-interaction.md](./references/human-interaction.md)   |
| Database Safety                              | [references/database-safety.md](./references/database-safety.md)       |
| MCP Servers (Context7, Playwright)           | [references/mcp-servers.md](./references/mcp-servers.md)               |
| Quality Validation Loop                      | [references/quality-validation.md](./references/quality-validation.md) |
| CodeRabbit Review Loop                       | [references/coderabbit-review.md](./references/coderabbit-review.md)   |
| Error Recovery (continue/stop/custom)        | [references/error-recovery.md](./references/error-recovery.md)         |
| State File Management + Rate Limiting        | [references/state-files.md](./references/state-files.md)               |
| Branch, Commit, and PR Conventions           | [references/conventions.md](./references/conventions.md)               |
| Common Workflow Phases + Subagent Delegation | [references/workflow-phases.md](./references/workflow-phases.md)       |

## Common Workflow Phases (Summary)

1. **Discovery/Validation** — Verify files exist, status is correct, git is clean
2. **Implementation** — Create issue/branch, implement features, use MCP servers
3. **Quality Validation** — Run full loop: see [quality-validation.md](./references/quality-validation.md)
4. **QA Gate** (optional) — Run QA review, apply fixes, re-validate
5. **Commit and PR** — Format code, commit, create PR, write state file
6. **CodeRabbit Review** — Loop through suggestions: see [coderabbit-review.md](./references/coderabbit-review.md)
7. **Merge** — Verify PR mergeable, squash merge, verify issue closes
8. **Cleanup** — Checkout main, pull, delete branch, report completion
