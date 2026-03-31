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

Run:
#file:../../prompts/prompt.sh

with:

- timeout: 0
- argument: a clear, concise prompt describing exactly what information is needed

## Handling the response

- Treat the response as user-provided input
- Add it to context as if it came from a file
- Continue execution using that input
