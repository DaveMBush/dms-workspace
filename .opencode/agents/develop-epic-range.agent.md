---
description: 'Fully autonomous epic development for range of epics'
argument-hint: firstEpic=45 lastEpic=56
tools: {execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true}
agents: [develop-epic]
user-invocable: true
---

## Instructions

- Validate `firstEpic` and `lastEpic` first. Both must be integers and `firstEpic <= lastEpic`. If invalid, abort with an error message.
- Read `.opencode/agents/develop-epic.agent.md` once at the start, including its full contents and frontmatter. If the file cannot be read, abort immediately and report the path that failed.
- Sequentially for each integer epic in `[${firstEpic}, ${lastEpic}]` inclusive, bind that value to `epic`, then call the `runSubagent` tool with:
  - `description`: `"Develop epic ${epic}"`
  - `prompt`: Include the full contents of `.opencode/agents/develop-epic.agent.md`, substituting every occurrence of `${epic}` with the current epic value.
- Execute subagent calls sequentially, one epic at a time, waiting for each to complete before starting the next.
- On subagent failure, record the epic ID and the error, continue with the next epic, and retry nothing automatically.
- At the end, output a summary of succeeded epics and failed epics.
