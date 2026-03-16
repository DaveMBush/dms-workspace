# Error Recovery Strategy

When `prompt.sh` returns different values:

## "continue"

- Try alternative solution approaches
- **Use Context7** to research correct approaches
- **Use Playwright** to validate assumptions about UI behavior
- Attempt fixes with different strategies
- If still stuck after 5 more attempts: Call `prompt.sh` again with updated context

## "stop"

- Document current state in story debug log or appropriate location
- Commit progress with "[WIP] Story ${story} - stopped at <phase>"
- DO NOT merge
- Report final state and exit workflow

## Custom Instructions

- Parse instructions as additional guidance
- Apply guidance to current problem
- Continue workflow from interruption point
- Treat custom instructions as if they came from a referenced workflow file
