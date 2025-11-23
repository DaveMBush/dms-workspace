# Story AE.2: Migrate Account Detail Container

## Story

**As a** user viewing a specific account
**I want** the account context properly set up
**So that** child components have access to account data

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/account-detail.component.ts`
- Container that provides SmartNgRX entity context
- Reads accountId from route params

**Migration Target:**

- Same container pattern
- Provides trades entity context

## Acceptance Criteria

### Functional Requirements

- [ ] Account ID read from route
- [ ] SmartNgRX trades entity provided
- [ ] Child routes render correctly

### Technical Requirements

- [ ] Uses `provideSmartFeatureSignalEntities` in route
- [ ] Passes account context to children

## Technical Approach

Create `apps/rms-material/src/app/account-panel/account-detail.component.ts`:

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';

@Component({
  selector: 'rms-account-detail',
  imports: [RouterOutlet],
  template: `
    <div class="account-detail-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrl: './account-detail.component.scss',
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);

  accountId = signal<string>('');

  ngOnInit(): void {
    const context = this;
    this.route.parent?.paramMap.subscribe(function onParams(params) {
      context.accountId.set(params.get('accountId') ?? '');
    });
  }
}
```

## Definition of Done

- [ ] Account ID extracted from route
- [ ] Entity context provided via route
- [ ] Child components render
- [ ] All validation commands pass
