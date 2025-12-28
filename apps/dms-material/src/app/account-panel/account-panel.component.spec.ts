import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { AccountPanelComponent } from './account-panel.component';

describe('AccountPanelComponent', () => {
  let component: AccountPanelComponent;
  let fixture: ComponentFixture<AccountPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPanelComponent, NoopAnimationsModule],
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
