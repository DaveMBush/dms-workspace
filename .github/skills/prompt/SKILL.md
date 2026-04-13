---
description: 'Use this when more information is needed from the user, or when a decision or confirmation is required.'
name: 'prompt'
---

## When to use this skill (MANDATORY)

Invoke this skill instead of continuing the conversation when ANY of the following are true:

- Rate limit for the current model is exceeded and you need to ask the user to wait before retrying
- Required input is missing, ambiguous, or incomplete
- Multiple reasonable interpretations exist
- A decision, confirmation, or preference is required from the user
- The process would otherwise require asking the user a follow-up question
- You are about to pause and wait for user input

DO NOT guess or assume missing values. Always call this skill.

## How to use

Call `vscode_askQuestions` with a single question.

Use:

- `header`: a short identifier such as `needed_input` or `confirmation`
- `question`: a clear, concise prompt describing exactly what information is needed
- `allowFreeformInput`: `true` unless the workflow requires a fixed choice
- `options`: only when the workflow needs bounded choices such as `continue` / `stop`

This tool displays the question in the chat UI and blocks until the user answers.

## Handling the response

- Wait for the `vscode_askQuestions` result before continuing
- Treat the response as user-provided input
- Add it to context as if it came from a file
- If the workflow expects a control response, honor explicit `stop` or `continue` answers
- Continue execution using that input
