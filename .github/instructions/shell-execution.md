---
description: 'Shell execution rules for efficient command execution using bash MCP server'
applyTo: '**'
---

# Shell Execution Rules

## Preferred Shell Execution Method

**ALWAYS use the bash MCP server for shell command execution instead of `run_in_terminal`.**

### Tool Preference

1. **Primary**: Use `mcp_bash_run` for all blocking commands that should complete before proceeding
2. **Secondary**: Use `mcp_bash_run_background` ONLY for true background processes (servers, watchers, long-running services)
3. **Avoid**: Do NOT use `run_in_terminal` unless bash MCP tools are unavailable

### Why Bash MCP Server?

- More reliable command execution
- Better output capture and error handling
- Cleaner process management
- Consistent working directory handling
- Explicit timeout control

## Efficient Command Execution Pattern

### ✅ CORRECT: Wait for completion, then read results

When executing commands, use `timeout: 0` (no timeout) and wait for the command to complete before reading any output files:

```typescript
// Run command and wait for completion
mcp_bash_run({
  command: 'pnpm test > test-output.txt 2>&1',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0, // Wait for completion
});

// After command completes, read the file ONCE
read_file({ filePath: 'test-output.txt', startLine: 1, endLine: 100 });
```

### ❌ INCORRECT: Monitor file while command runs

**Do NOT run a command in the background and repeatedly monitor its output file:**

```typescript
// ANTI-PATTERN - wastes tokens and API calls
mcp_bash_run_background({
  command: "pnpm test > test-output.txt 2>&1",
  cwd: "/home/dave/code/dms-workspace"
});

// Then repeatedly reading the file while it's being written
// This is inefficient and expensive!
read_file({ filePath: "test-output.txt", ... });  // Multiple times
```

### When to Use Background Execution

Use `mcp_bash_run_background` ONLY for:

- **Development servers** (e.g., `pnpm dev`, `pnpm start`)
- **Watch mode processes** (e.g., `pnpm test:watch`)
- **Long-running services** (e.g., database servers, Docker containers)
- **True background processes** that need to continue running while other work proceeds

### Command Timeout Guidelines

- **`timeout: 0`**: For most commands where completion time is uncertain or could be long. This means "wait indefinitely until complete"
- **Specific timeout**: Only use when you know the command should complete quickly and want to abort if it hangs

## Common Command Examples

### Build/Compile Commands

```typescript
mcp_bash_run({
  command: 'pnpm build',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0, // Wait for build to complete
});
```

### Test Commands

```typescript
mcp_bash_run({
  command: 'pnpm test',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0, // Wait for tests to complete
});
```

### Lint/Format Commands

```typescript
mcp_bash_run({
  command: 'pnpm lint',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0, // Wait for linting to complete
});
```

### Git Commands

```typescript
mcp_bash_run({
  command: 'git status',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0,
});
```

### Development Server (Background OK)

```typescript
mcp_bash_run_background({
  command: 'pnpm dev',
  cwd: '/home/dave/code/dms-workspace',
});
```

## Output Handling

### For Commands with Large Output

If a command produces large output, use shell redirection and read selectively:

```typescript
// Run command, redirect output
mcp_bash_run({
  command: 'pnpm test 2>&1 | tee test-results.txt',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0,
});

// Read relevant portions
read_file({
  filePath: 'test-results.txt',
  startLine: 1,
  endLine: 50, // Read first 50 lines
});

// If needed, read more specific sections
read_file({
  filePath: 'test-results.txt',
  startLine: 100,
  endLine: 150,
});
```

### For Commands with Structured Output

Use tools like `grep`, `head`, `tail`, or `jq` to filter output before capture:

```typescript
mcp_bash_run({
  command: "pnpm test 2>&1 | grep -E '(PASS|FAIL|Error)' > test-summary.txt",
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0,
});
```

## Error Handling

Always check command results and handle errors appropriately:

```typescript
const result = mcp_bash_run({
  command: 'pnpm build',
  cwd: '/home/dave/code/dms-workspace',
  timeout: 0,
});

// The bash MCP server returns structured output with exit code and stderr
// Check for errors and handle them appropriately
```

## Summary

1. **Use `mcp_bash_run` with `timeout: 0`** for all normal commands
2. **Wait for command completion** before reading any output files
3. **Read output files ONCE** after completion, not repeatedly during execution
4. **Use `mcp_bash_run_background`** only for true background processes
5. **Filter large outputs** using shell tools before capture
6. **Never monitor files** while a command is still running - this wastes tokens and money

These practices ensure:

- ✅ Efficient token usage
- ✅ Fewer API calls
- ✅ Lower costs
- ✅ More reliable execution
- ✅ Cleaner, more maintainable code

## Rate Limits

To avoid GitHub Copilot rate limiting:
- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
