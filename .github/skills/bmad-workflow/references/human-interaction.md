# Human Interaction Protocol

**NEVER stop, yield back to the user, or pause execution without first calling `prompt.sh`.**

When human input is needed:

1. Use `run_in_terminal` to execute: `bash .github/prompts/prompt.sh "your message here"`
2. **CRITICAL**: Set `timeout: 0` (no timeout — wait indefinitely for human response)
3. **CRITICAL**: Set `isBackground: false` (blocking call)
4. Wait for the script to complete — it blocks until the user responds via the Zenity GUI dialog
5. The dialog shows the message as a label above an editable textarea. The user types their response and clicks OK.
6. Read the return value from terminal output:
   - `"continue"` — try alternatives / proceed
   - `"stop"` — abort and document state
   - Any other text — treat as custom instructions
   - Empty / cancelled — treated as `"stop"` by the script
7. Handle the response appropriately before continuing

**Example Tool Call:**

```typescript
run_in_terminal({
  command: 'bash .github/prompts/prompt.sh "Unable to merge PR: conflicts detected"',
  explanation: 'Requesting human decision on merge conflicts',
  goal: 'Get human guidance',
  isBackground: false,
  timeout: 0, // CRITICAL: No timeout — wait indefinitely
});
```

**NEVER**:

- Stop, yield back to the user, or write messages like "awaiting your approval" without first running prompt.sh
- Use a timeout other than 0 when calling prompt.sh
- Continue without handling the response from prompt.sh

The prompt.sh script IS the human interaction mechanism. The Zenity dialog handles all user interaction.

**IMPORTANT**:

- You must wait for the response before proceeding. The process should block any further action until it returns.
- These rules apply every time `.github/prompts/prompt.sh` is called, regardless of the phase or context.
- Do not hide or minimize the terminal window — the operator needs to see the dialog.

# Exit Code 130 Handling

Exit code 130 indicates process interruption (SIGINT), which can occur when:

- Agent infrastructure restarts/summarizes (NOT user action — most common)
- User presses Ctrl+C (deliberate user action — rare)

**Strategy**: When `prompt.sh` exits with code 130:

1. **RETRY** the same `prompt.sh` call up to 3 times (waiting 5 seconds between attempts)
2. Log each attempt: "prompt.sh interrupted (exit 130), retrying attempt N/3..."
3. If all 3 retries also exit 130: Treat as "stop" and log "All 3 prompt.sh retries failed with exit 130 — proceeding to next phase"

**Do NOT treat exit code 130 as an implicit "stop" on the first occurrence** — it most likely means the dialog was still open and the agent was restarted/summarized, not that the user chose to stop.
