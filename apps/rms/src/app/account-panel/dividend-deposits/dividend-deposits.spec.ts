import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DividendDeposits } from './dividend-deposits';

describe('DividendDeposits', () => {
  let component: DividendDeposits;
  let fixture: ComponentFixture<DividendDeposits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendDeposits],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDeposits);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
