import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SoldPositionsComponent } from './sold-positions.component';

describe('SoldPositionsComponent', () => {
  let component: SoldPositionsComponent;
  let fixture: ComponentFixture<SoldPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  it('should define columns', () => {
    expect(component.columns.length).toBe(9);
    expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
  });

  it('should have buy editable', () => {
    const col = component.columns.find((c) => c.field === 'buy');
    expect(col?.editable).toBe(true);
  });

  it('should have buy_date editable', () => {
    const col = component.columns.find((c) => c.field === 'buy_date');
    expect(col?.editable).toBe(true);
  });

  it('should have quantity editable', () => {
    const col = component.columns.find((c) => c.field === 'quantity');
    expect(col?.editable).toBe(true);
  });

  it('should have sell editable', () => {
    const col = component.columns.find((c) => c.field === 'sell');
    expect(col?.editable).toBe(true);
  });

  it('should have sell_date editable', () => {
    const col = component.columns.find((c) => c.field === 'sell_date');
    expect(col?.editable).toBe(true);
  });

  it('should have capitalGain column', () => {
    const col = component.columns.find((c) => c.field === 'capitalGain');
    expect(col).toBeTruthy();
  });

  it('should have capitalGainPercentage column', () => {
    const col = component.columns.find(
      (c) => c.field === 'capitalGainPercentage'
    );
    expect(col).toBeTruthy();
  });

  it('should have daysHeld column', () => {
    const col = component.columns.find((c) => c.field === 'daysHeld');
    expect(col).toBeTruthy();
  });

  it('should call onCellEdit without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onCellEdit(trade, 'sell', 150)).not.toThrow();
  });
});
