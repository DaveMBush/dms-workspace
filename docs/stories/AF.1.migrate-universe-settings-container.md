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

## Test-Driven Development Approach

**Note:** This is a simple container component with no business logic. Unit tests are minimal and focus on component creation and router outlet presence.

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/universe-settings/universe-settings.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UniverseSettings } from './universe-settings';
import { RouterTestingModule } from '@angular/router/testing';

describe('UniverseSettings', () => {
  let component: UniverseSettings;
  let fixture: ComponentFixture<UniverseSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniverseSettings, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(UniverseSettings);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have router outlet', () => {
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should have container class', () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.universe-settings-container');
    expect(container).toBeTruthy();
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

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
  styles: [
    `
      .universe-settings-container {
        padding: 1rem;
      }
    `,
  ],
})
export class UniverseSettings {}
```

## Definition of Done

- [ ] Container component created
- [ ] Routing configured
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

- [ ] Universe settings route accessible
- [ ] Container renders child routes
- [ ] Navigation to universe settings works

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
