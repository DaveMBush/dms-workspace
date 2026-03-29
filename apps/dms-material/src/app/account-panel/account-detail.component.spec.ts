import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AccountDetailComponent } from './account-detail.component';

describe('AccountDetailComponent', () => {
  let component: AccountDetailComponent;
  let fixture: ComponentFixture<AccountDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { paramMap: of(new Map([['accountId', 'account-123']])) },
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

  it('should handle missing route parent gracefully', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { parent: undefined },
        },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(AccountDetailComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    expect(c.accountId()).toBe('');
  });

  it('should default accountId to empty string when param is missing', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { paramMap: of(new Map()) },
          },
        },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(AccountDetailComponent);
    const c = f.componentInstance;
    c.ngOnInit();
    expect(c.accountId()).toBe('');
  });
});
