---
description: Fully autonomous epic development - all stories from start to merge
agent: dev
argument-hint: epic=AD
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Epic Development Workflow

## PHASE 1: Epic Discovery and Validation

1. **Discover Stories for Epic ${epic}**

   - Search for all story files matching: `docs/stories/${epic}.*.md`
   - Parse story numbers from filenames (e.g., AD.1, AD.2, AD.3)
   - Sort stories by numeric value (1, 2, 3, ...)
   - If no stories found: Call `.github/prompts/prompt.sh "No stories found for epic ${epic}"`

2. **Validate Story Status**
   - For each story file found:
     - Read the story file
     - Check the `Status` field (should be "Approved")
     - If any story has status other than "Approved": Call `.github/prompts/prompt.sh "Story ${story} has status '${actual_status}' but expected 'Approved'. All stories must pass QA before epic implementation. Continue anyway?"`
   - Create ordered list of stories to implement

## PHASE 2: Sequential Story Implementation

For each story in the ordered list:

1. **Execute Story Development**

   - Run: `run #file:./develop-story.prompt.md story=${current_story}`
   - This executes all 7 phases: validation, implementation, quality checks, QA review, PR creation, CodeRabbit review, and merge

2. **Handle Story Failures**
   - If story execution calls prompt.sh with "stop":
     - Document state
     - Call `.github/prompts/prompt.sh "Story ${story} failed and was stopped. Abort entire epic or skip this story and continue?"`
   - If custom instructions received: Apply and retry story

## PHASE 3: Pre-E2E Checkpoint

1. **Identify Last Story**

   - Last story = story with highest numeric value in the ordered list

2. **Pre-E2E Confirmation**

   - Before executing the last story:
     - Call `.github/prompts/prompt.sh "Epic ${epic}: ${N-1} of ${N} stories complete. About to implement final story (${last_story}, typically e2e tests). Any corrections or additional instructions before proceeding?"`
   - Handle response:
     - "continue": Proceed with last story
     - "stop": Document state and exit
     - Custom instructions: Apply instructions, then proceed with last story

3. **Execute Final Story**
   - Run develop-story.prompt.md for last story

## PHASE 4: Epic Completion

Report completion:

```text
✅ Epic ${epic} Complete

All ${N} stories implemented and merged to main.
```

## Error Recovery

- **Story fails**: prompt.sh decides abort epic / skip story / retry with help
- **Status validation fails**: prompt.sh decides whether to continue anyway
- **Rate limits or conflicts**: Individual stories handle via develop-story.prompt.md
