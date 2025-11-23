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
      <a mat-tab-link routerLink="./" routerLinkActive #rla1="routerLinkActive"
         [routerLinkActiveOptions]="{exact: true}" [active]="rla1.isActive">
        Summary
      </a>
      <a mat-tab-link routerLink="open" routerLinkActive #rla2="routerLinkActive"
         [active]="rla2.isActive">
        Open Positions
      </a>
      <a mat-tab-link routerLink="sold" routerLinkActive #rla3="routerLinkActive"
         [active]="rla3.isActive">
        Sold Positions
      </a>
      <a mat-tab-link routerLink="div-dep" routerLinkActive #rla4="routerLinkActive"
         [active]="rla4.isActive">
        Dividend Deposits
      </a>
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
