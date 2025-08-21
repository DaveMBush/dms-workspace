# RMS Workspace Development Guidelines

This document provides Claude Code with the development standards and conventions for the RMS Workspace project.

## Tech Stack

- **Frontend**: Angular 20 with TypeScript
- **UI Library**: PrimeNG version 20 with TailwindCSS for styling
- **Testing**: Jest
- **Package Manager**: pnpm
- **Workspace**: Nx 21.2.0
- **Focus**: Signals over alternatives, clear readable code, performance, and maintainability

## Angular Development Standards

### Component Guidelines

- **Standalone Components**: Do not specify `standalone: true` in component decorators (it's the default)
- **Signals**: Use signals for all inputs, outputs, and template-accessed variables
- **External Files**: Never use inline HTML or SCSS - always use external files
- **Naming**: Use `component-name.*` instead of `component-name.component.*`
- **Service Injection**: Always use `inject()` instead of constructor injection

```typescript
// ✅ Good: Using inject() and signals
export class UserProfile {
  private userService = inject(UserService);
  user = signal<User | null>(null);
  
  ngOnInit() {
    this.user.set(this.userService.getCurrentUser());
  }
}

// ❌ Bad: Constructor injection
export class UserProfile {
  constructor(private userService: UserService) {}
}
```

### Component Architecture

When components exceed 250 lines or contain multiple private utility methods:
- Extract localStorage operations to dedicated storage services
- Move complex validation logic to validation services
- Separate data transformation logic to transformer services
- Use `viewProviders: [MyService]` to inject services
- Keep components focused on UI logic and user interactions

### Service and Utility Functions

**Always prefer standalone functions over static methods in classes:**

```typescript
// ✅ Good: Standalone functions
export function formatDate(date: Date): string {
  return date.toISOString();
}

// ❌ Bad: Static methods
export class DateHelper {
  static formatDate(date: Date): string {
    return date.toISOString();
  }
}
```

**File Naming for Functions:**
- Use `function-name.function.ts` pattern
- Use kebab-case for filenames
- Always use `.function.ts` extension

## Code Quality Standards

### General Rules

- **Line Length**: Maximum 80 characters
- **Function Parameters**: Maximum 4 parameters
- **Function Length**: Maximum 50 executable lines
- **Nesting**: Do not nest code more than 2 levels deep
- **Comments**: Preserve JSDoc comments when refactoring

### Code Style

- Follow rules defined in `.eslintrc.json`, `.prettierrc`, `.htmlhintrc`, and `.editorconfig`
- Focus on performance, readability, and maintainability
- Always include required imports with proper component naming
- Write correct, up-to-date, bug-free, fully functional code
- Double-check work before completion

### Development Approach

- Think step by step and provide detailed, thoughtful solutions
- Ask for clarification when more information is needed
- Be concise and minimize extraneous prose
- If unsure about something, say so instead of guessing

## Nx Workspace Guidelines

### Project Structure

- This is an Nx workspace using Nx 21.2.0 with pnpm as package manager
- Use Nx MCP server tools when available
- Follow Nx best practices for project organization

### Task Execution

- Use `nx run <taskId>` to rerun tasks in proper Nx context
- For continuous tasks, use `nx_current_running_task_output` to monitor
- Always run tasks through Nx when possible

### Generation Workflow

1. Learn workspace specifics using `nx_workspace` tool
2. Get available generators using `nx_generators` tool
3. Get generator details using `nx_generator_schema` tool
4. Use minimal, well-considered options
5. Open generator UI with `nx_open_generate_ui`
6. Read generator logs with `nx_read_generator_log`

## File and Import Conventions

### Component Files
```
user-profile.ts           // Component logic
user-profile.html         // Template
user-profile.scss         // Styles
```

### Function Files
```
format-date.function.ts
parse-user.function.ts
validate-input.function.ts
```

### Import Examples
```typescript
// ✅ Good: Specific function imports
import { formatDate } from './format-date.function';
import { parseUser } from './parse-user.function';

// ✅ Good: Service injection
private userService = inject(UserService);

// ✅ Good: Signal usage
userData = signal<User[]>([]);
selectedUser = computed(() => this.userData().find(u => u.active));
```

## Testing Requirements

- Use Jest for all testing
- Write tests for all new functionality
- Ensure tests pass before committing
- Follow existing test patterns in the codebase

## When in Doubt

- Follow existing patterns in the codebase
- Check neighboring files for consistency
- Prioritize readability and maintainability
- Ask for clarification rather than making assumptions