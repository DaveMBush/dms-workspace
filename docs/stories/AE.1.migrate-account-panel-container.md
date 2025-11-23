# Story AE.1: Migrate Account Panel Container

## Story

**As a** user viewing account details
**I want** tabbed navigation between account features
**So that** I can easily switch between summary, positions, and dividends

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/account-panel.component.ts`
- Contains tab navigation for sub-features

**Migration Target:**

- Material tab navigation (`mat-tab-nav-bar`)
- Router outlet for content

## Acceptance Criteria

### Functional Requirements

- [ ] Tab bar displays: Summary, Open, Sold, Div-Dep
- [ ] Active tab highlighted
- [ ] Tab click navigates to route
- [ ] Content renders in outlet

### Technical Requirements

- [ ] Uses `mat-tab-nav-bar` with `mat-tab-link`
- [ ] Router integration for navigation
- [ ] Route matching for active state

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/account-panel.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountPanelComponent } from './account-panel.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

describe('AccountPanelComponent', () => {
  let component: AccountPanelComponent;
  let fixture: ComponentFixture<AccountPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPanelComponent, NoopAnimationsModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanelComponent);
    component = fixture.componentInstance;
  });

  it('should render tab nav bar', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[mat-tab-nav-bar]')).toBeTruthy();
  });

  it('should render four tab links', () => {
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('[mat-tab-link]');
    expect(links.length).toBe(4);
  });

  it('should have Summary tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Summary');
  });

  it('should have Open Positions tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Open Positions');
  });

  it('should have Sold Positions tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sold Positions');
  });

  it('should have Dividend Deposits tab', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dividend Deposits');
  });

  it('should render router outlet', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/account-panel/account-panel.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'rms-account-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  template: `
    <nav mat-tab-nav-bar [tabPanel]="tabPanel">
      <a mat-tab-link routerLink="./" routerLinkActive #rla1="routerLinkActive" [routerLinkActiveOptions]="{ exact: true }" [active]="rla1.isActive"> Summary </a>
      <a mat-tab-link routerLink="open" routerLinkActive #rla2="routerLinkActive" [active]="rla2.isActive"> Open Positions </a>
      <a mat-tab-link routerLink="sold" routerLinkActive #rla3="routerLinkActive" [active]="rla3.isActive"> Sold Positions </a>
      <a mat-tab-link routerLink="div-dep" routerLinkActive #rla4="routerLinkActive" [active]="rla4.isActive"> Dividend Deposits </a>
    </nav>
    <mat-tab-nav-panel #tabPanel>
      <router-outlet></router-outlet>
    </mat-tab-nav-panel>
  `,
  styleUrl: './account-panel.component.scss',
})
export class AccountPanelComponent {}
```

## Definition of Done

- [ ] Tab bar displays all tabs
- [ ] Active tab highlighted
- [ ] Navigation works
- [ ] Content renders
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

- [ ] Tab bar displays Summary, Open, Sold, Div-Dep tabs
- [ ] Active tab is visually highlighted
- [ ] Clicking tab navigates to correct route
- [ ] Tab content renders in router outlet
- [ ] Direct URL navigation highlights correct tab

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
