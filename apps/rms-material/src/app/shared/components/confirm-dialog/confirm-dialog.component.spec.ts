import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmDialogData } from '../../types/confirm-dialog-data.interface';
import { ConfirmDialogComponent } from './confirm-dialog.component';

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

  describe('display', () => {
    it('should display title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h2').textContent).toContain('Test Title');
    });

    it('should display message', () => {
      const compiled = fixture.nativeElement;
      expect(
        compiled.querySelector('mat-dialog-content').textContent
      ).toContain('Test Message');
    });

    it('should have mat-dialog-title attribute on title element', () => {
      const compiled = fixture.nativeElement;
      const title = compiled.querySelector('[mat-dialog-title]');
      expect(title).toBeTruthy();
    });

    it('should have mat-dialog-content element', () => {
      const compiled = fixture.nativeElement;
      const content = compiled.querySelector('mat-dialog-content');
      expect(content).toBeTruthy();
    });

    it('should have mat-dialog-actions element', () => {
      const compiled = fixture.nativeElement;
      const actions = compiled.querySelector('mat-dialog-actions');
      expect(actions).toBeTruthy();
    });

    it('should align actions to end', () => {
      const compiled = fixture.nativeElement;
      const actions = compiled.querySelector('mat-dialog-actions');
      expect(actions.getAttribute('align')).toBe('end');
    });
  });

  describe('buttons', () => {
    it('should display two buttons', () => {
      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should use default text for Cancel button if not provided', () => {
      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons[0].textContent.trim()).toBe('Cancel');
    });

    it('should use default text for Confirm button if not provided', () => {
      const compiled = fixture.nativeElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons[1].textContent.trim()).toBe('Confirm');
    });

    it('should have mat-button on cancel button', () => {
      const compiled = fixture.nativeElement;
      const cancelButton = compiled.querySelector('button[mat-button]');
      expect(cancelButton).toBeTruthy();
    });

    it('should have mat-raised-button on confirm button', () => {
      const compiled = fixture.nativeElement;
      const confirmButton = compiled.querySelector('button[mat-raised-button]');
      expect(confirmButton).toBeTruthy();
    });

    it('should have btn-primary class on confirm button', () => {
      const compiled = fixture.nativeElement;
      const confirmButton = compiled.querySelector('button[mat-raised-button]');
      expect(confirmButton.classList.contains('btn-primary')).toBe(true);
    });
  });

  describe('onConfirm()', () => {
    it('should call dialogRef.close with true', () => {
      component.onConfirm();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should be called when confirm button is clicked', () => {
      const spy = vi.spyOn(component, 'onConfirm');
      const compiled = fixture.nativeElement;
      const confirmButton = compiled.querySelector('button[mat-raised-button]');
      confirmButton.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onCancel()', () => {
    it('should call dialogRef.close with false', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should be called when cancel button is clicked', () => {
      const spy = vi.spyOn(component, 'onCancel');
      const compiled = fixture.nativeElement;
      const cancelButton = compiled.querySelector('button[mat-button]');
      cancelButton.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('custom button labels', () => {
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

    it('should handle empty custom button text gracefully', async () => {
      const customData: ConfirmDialogData = {
        title: 'Custom',
        message: 'Custom message',
        confirmText: '',
        cancelText: '',
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
      // Empty string is falsy, so defaults should be used
      expect(buttons[0].textContent.trim()).toBe('Cancel');
      expect(buttons[1].textContent.trim()).toBe('Confirm');
    });
  });

  describe('edge cases', () => {
    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500);
      const customData: ConfirmDialogData = {
        title: longTitle,
        message: 'Message',
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
      expect(compiled.querySelector('h2').textContent).toContain(longTitle);
    });

    it('should handle very long message', async () => {
      const longMessage = 'B'.repeat(1000);
      const customData: ConfirmDialogData = {
        title: 'Title',
        message: longMessage,
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
      expect(
        compiled.querySelector('mat-dialog-content').textContent
      ).toContain(longMessage);
    });

    it('should escape HTML in title (XSS prevention)', async () => {
      const xssTitle = '<script>alert("xss")</script>';
      const customData: ConfirmDialogData = {
        title: xssTitle,
        message: 'Message',
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
      // Angular's {{ }} interpolation escapes HTML by default
      expect(compiled.querySelector('h2').textContent).toContain(
        '<script>alert("xss")</script>'
      );
      // Verify no actual script tag was created
      expect(compiled.querySelector('script')).toBeNull();
    });

    it('should escape HTML in message (XSS prevention)', async () => {
      const xssMessage = '<img src=x onerror=alert("xss")>';
      const customData: ConfirmDialogData = {
        title: 'Title',
        message: xssMessage,
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
      // Verify no actual img tag was created
      expect(compiled.querySelector('img')).toBeNull();
    });

    it('should handle special characters in text', async () => {
      const specialChars = '& < > " \' © ® ™ € £ ¥';
      const customData: ConfirmDialogData = {
        title: specialChars,
        message: specialChars,
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
      expect(compiled.querySelector('h2').textContent).toContain(specialChars);
    });

    it('should handle newlines in message', async () => {
      const messageWithNewlines = 'Line 1\nLine 2\nLine 3';
      const customData: ConfirmDialogData = {
        title: 'Title',
        message: messageWithNewlines,
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
      expect(
        compiled.querySelector('mat-dialog-content').textContent
      ).toContain('Line 1');
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog structure', () => {
      const compiled = fixture.nativeElement;
      // Dialog title should be properly associated
      expect(compiled.querySelector('[mat-dialog-title]')).toBeTruthy();
      // Content should be in mat-dialog-content
      expect(compiled.querySelector('mat-dialog-content')).toBeTruthy();
      // Actions should be in mat-dialog-actions
      expect(compiled.querySelector('mat-dialog-actions')).toBeTruthy();
    });
  });
});
