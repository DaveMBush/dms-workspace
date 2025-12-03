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

- [ ] All GUI look as close to the existing RMS app as possible
- [ ] Account ID read from route
- [ ] SmartNgRX trades entity provided
- [ ] Child routes render correctly

### Technical Requirements

- [ ] Uses `provideSmartFeatureSignalEntities` in route
- [ ] Passes account context to children

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/account-detail.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDetailComponent } from './account-detail.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AccountDetailComponent', () => {
  let component: AccountDetailComponent;
  let fixture: ComponentFixture<AccountDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountDetailComponent, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { paramMap: of({ get: () => 'account-123' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDetailComponent);
    component = fixture.componentInstance;
  });

  it('should initialize with empty accountId', () => {
    expect(component.accountId()).toBe('');
  });

  it('should set accountId from route params on init', () => {
    component.ngOnInit();
    expect(component.accountId()).toBe('account-123');
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

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Account detail loads correct account data
- [ ] Account ID in URL matches displayed account
- [ ] Child routes render within container
- [ ] SmartNgRX trades entity loads for account

### Edge Cases

- [ ] Invalid account ID shows 404 or redirect
- [ ] Account ID not found shows appropriate error
- [ ] Account data loading shows skeleton/spinner
- [ ] Account data error shows retry option
- [ ] Account switch preserves scroll position (or resets appropriately)
- [ ] Real-time account data updates reflected
- [ ] Account permissions respected (view-only vs edit)
- [ ] Deep linking to account/:id/specific-tab works
- [ ] Browser refresh reloads account data correctly
- [ ] Concurrent account data requests deduplicated

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
