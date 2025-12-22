---
model: GPT-5.1-Codex-Mini (Preview) (copilot)
agent: dev
---

- run `pnpm format`
- commit the changes and create a pull request. Do not reference Claude code in either the commit or the PR.
- Make sure you reference the github issue number in the PR so that when we merge the PR it will close the issue automatically.
- When drafting the PR description, do not include literal escape sequences like `\n`. Instead, write the summary as regular Markdown (paragraphs or bullet lists) derived from the story's "Change Log" section and repeat the testing steps under a "Testing" heading.
