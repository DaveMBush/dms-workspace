import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  const mockData: ConfirmDialogData = {
    title: 'Test Title',
    message: 'Test Message',
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display title and message', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h2').textContent).toContain('Test Title');
    expect(compiled.querySelector('mat-dialog-content').textContent).toContain(
      'Test Message'
    );
  });

  it('should call dialogRef.close with true on confirm', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call dialogRef.close with false on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should use default text for buttons if not provided', () => {
    const compiled = fixture.nativeElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons[0].textContent.trim()).toBe('Cancel');
    expect(buttons[1].textContent.trim()).toBe('Confirm');
  });

  it('should use custom text for buttons if provided', async () => {
    const customData: ConfirmDialogData = {
      title: 'Custom',
      message: 'Custom message',
      confirmText: 'Yes',
      cancelText: 'No',
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: customData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    const customFixture = TestBed.createComponent(ConfirmDialogComponent);
    customFixture.detectChanges();

    const compiled = customFixture.nativeElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons[0].textContent.trim()).toBe('No');
    expect(buttons[1].textContent.trim()).toBe('Yes');
  });
});
