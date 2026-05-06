---
description: 'Fully autonomous epic development for range of epics'
argument-hint: firstEpic=45 lastEpic=56
model: Claude Sonnet 4.6 High (copilot)
tools: [read, agent, todo, mcp_bash/*]
agents: [develop-epic]
user-invocable: true
---

- for each epic ${firstEpic} - ${lastEpic}, call the `runSubagent` tool with:
  - `model`: `"Claude Sonnet 4.6 High (copilot)"`
  - `description`: `"Develop story ${current_story}"`
  - `prompt`: Read the full contents of `.github/agents/develop-epic.agent.md` and include them verbatim, substituting `${epic}` with the actual current epic ID.
