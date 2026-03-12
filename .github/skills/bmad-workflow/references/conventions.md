# Branch Naming Conventions

- Feature story: `feat/story-${story}`
- Bug fix story: `debug/${story}-<issue-number>`
- Always include GitHub issue number when available

# Commit Message Conventions

- Link to GitHub issue: Include `#<issue-number>` in commit message
- CodeRabbit fixes: "Apply CodeRabbit suggestions"
- WIP when stopped: "[WIP] Story ${story} - stopped at <phase>"
- Final commits: Use story title or clear description of changes

# Pull Request Guidelines

- Title: Reference story ID and brief description
- Body: Derive from story's "Change Log" section
  - Do NOT include literal escape sequences like `\n`
  - Write as regular Markdown (paragraphs or bullet lists)
  - Repeat testing steps under a "Testing" heading
- Link to GitHub issue: Include `#<issue-number>` so PR merge auto-closes issue
- Do not reference Claude, AI, or automated code generation in PR descriptions
