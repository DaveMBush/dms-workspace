# MCP Server Resources

## Context7 Documentation Server

When you need information about APIs, libraries, or frameworks:

1. **Load the tool first**: `tool_search_tool_regex pattern="mcp_context7"`
2. Use `mcp_context7_resolve-library-id` to find available documentation
3. Use `mcp_context7_query-docs` to retrieve API usage examples and documentation

**Example use cases:**

- Need to know how to use Angular Material Dialog? Query Context7 first
- Verifying correct API usage for unfamiliar libraries
- Checking for deprecation warnings or breaking changes
- Getting code examples for complex integrations

## Playwright Browser Automation Server

When implementing or fixing UI components:

1. **Load the tool first**: `tool_search_tool_regex pattern="mcp_microsoft_pla"`
2. Use Playwright tools to validate UI behavior, interactions, and rendering
3. Run visual tests after UI changes to verify correctness

**Example use cases:**

- Validating UI after every UI component change
- Testing user interactions (clicks, form fills, navigation)
- Verifying responsive behavior
- Taking screenshots for visual regression checking
- Testing error states and edge cases
- After implementing a form, use Playwright to verify form submission works

## Tool Loading Pattern

Before using any MCP tool, load it first:

```bash
# Load both Context7 and Playwright
tool_search_tool_regex pattern="mcp_context7|mcp_microsoft_pla"

# Or load individually
tool_search_tool_regex pattern="mcp_context7"
tool_search_tool_regex pattern="mcp_microsoft_pla"
```
