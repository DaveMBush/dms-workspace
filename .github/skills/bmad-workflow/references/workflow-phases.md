# Common Workflow Phases

Most BMAD workflows follow this general structure:

1. **Discovery/Validation**: Verify files exist, status is correct, git is clean
2. **Implementation**: Create issue/branch, implement features, use MCP servers for guidance
3. **Quality Validation**: Run full validation loop (see quality-validation.md)
4. **QA Gate** (optional): Run QA review, apply fixes, re-validate
5. **Commit and PR**: Format code, commit, create PR, write state file
6. **CodeRabbit Review**: Loop through review suggestions, apply fixes, re-validate
7. **Merge**: Verify PR mergeable, merge with squash, verify issue closes
8. **Cleanup**: Checkout main, pull, delete branch, report completion

Phases may be delegated to subagents for modularity and better error handling.

# Subagent Delegation Pattern

For complex workflows (like epic development):

- Break workflow into distinct phases
- Delegate each phase to a specialized subagent
- Use state files to pass context between subagents (not large prompt contents)
- Each subagent should handle its own error recovery via `prompt.sh`
- Orchestrator reads state files to track progress and resume if needed
