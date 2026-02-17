import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountPanelComponent } from './account-panel.component';

// Mock the entire selectTrades module to avoid SmartNgRX initialization
vi.mock('../store/trades/selectors/select-trades.function', () => ({
  selectTrades: vi.fn().mockReturnValue([]),
}));

// Mock selectTradesEntity to avoid SmartNgRX initialization
vi.mock('../store/trades/selectors/select-trades-entity.function', () => ({
  selectTradesEntity: vi.fn().mockReturnValue([]),
}));

// Mock selectUniverses to avoid SmartNgRX initialization from AddPositionDialogComponent
vi.mock('../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

// Mock selectTopEntities to avoid SmartNgRX initialization
vi.mock('../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountsEntity to avoid SmartNgRX initialization
vi.mock('../store/accounts/selectors/select-accounts-entity.function', () => ({
  selectAccountsEntity: vi.fn().mockReturnValue([]),
}));

// Mock selectAccounts to avoid SmartNgRX initialization
vi.mock('../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Mock selectDivDepositEntity to avoid SmartNgRX initialization
vi.mock('../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue([]),
}));

describe('AccountPanelComponent', () => {
  let component: AccountPanelComponent;
  let fixture: ComponentFixture<AccountPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPanelComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanelComponent);
    component = fixture.componentInstance;
  });

  it('should render tab nav bar', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[mat-tab-nav-bar]')
    ).toBeTruthy();
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
