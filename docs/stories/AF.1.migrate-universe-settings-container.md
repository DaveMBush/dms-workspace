# Story AF.1: Migrate Universe Settings Container

## Story

**As a** user managing universe settings
**I want** access to universe configuration options
**So that** I can add symbols and manage my investment universe

## Context

**Current System:**

- Location: `apps/rms/src/app/universe-settings/universe-settings.ts`
- Container component for universe settings features

**Migration Target:**

- Simple container component
- Material styling

## Acceptance Criteria

### Functional Requirements

- [ ] Container renders correctly
- [ ] Navigation to universe settings works
- [ ] Child components load

### Technical Requirements

- [ ] Standalone component
- [ ] Router outlet if needed

## Technical Approach

Create `apps/rms-material/src/app/universe-settings/universe-settings.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'rms-universe-settings',
  imports: [RouterOutlet],
  template: `
    <div class="universe-settings-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .universe-settings-container {
      padding: 1rem;
    }
  `],
})
export class UniverseSettings {}
```

## Definition of Done

- [ ] Container component created
- [ ] Routing configured
- [ ] All validation commands pass
