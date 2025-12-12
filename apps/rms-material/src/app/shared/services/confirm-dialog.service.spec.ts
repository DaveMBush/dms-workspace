import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, Subject } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from '../types/confirm-dialog-data.interface';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let afterClosedSubject: Subject<boolean | undefined>;

  beforeEach(() => {
    afterClosedSubject = new Subject<boolean | undefined>();
    mockDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => afterClosedSubject.asObservable(),
      }),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockDialog }],
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  describe('confirm()', () => {
    it('should open dialog with ConfirmDialogComponent', () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data,
        })
      );
    });

    it('should configure dialog with 400px width', () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          width: '400px',
        })
      );
    });

    it('should pass custom title and message to dialog', () => {
      const data: ConfirmDialogData = {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this?',
      };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: {
            title: 'Delete Item',
            message: 'Are you sure you want to delete this?',
          },
        })
      );
    });

    it('should pass custom button labels to dialog', () => {
      const data: ConfirmDialogData = {
        title: 'Test',
        message: 'Message',
        confirmText: 'Yes, Delete',
        cancelText: 'No, Keep',
      };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            confirmText: 'Yes, Delete',
            cancelText: 'No, Keep',
          }),
        })
      );
    });

    it('should return true when user confirms', async () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      const resultPromise = firstValueFrom(service.confirm(data));

      afterClosedSubject.next(true);
      afterClosedSubject.complete();

      const result = await resultPromise;
      expect(result).toBe(true);
    });

    it('should return false when user cancels', async () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      const resultPromise = firstValueFrom(service.confirm(data));

      afterClosedSubject.next(false);
      afterClosedSubject.complete();

      const result = await resultPromise;
      expect(result).toBe(false);
    });

    it('should return false when dialog is closed without result', async () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      const resultPromise = firstValueFrom(service.confirm(data));

      afterClosedSubject.next(undefined);
      afterClosedSubject.complete();

      const result = await resultPromise;
      expect(result).toBe(false);
    });

    it('should return false when dialog result is null', async () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      const resultPromise = firstValueFrom(service.confirm(data));

      afterClosedSubject.next(null as unknown as boolean);
      afterClosedSubject.complete();

      const result = await resultPromise;
      expect(result).toBe(false);
    });

    it('should return observable that can be subscribed multiple times', () => {
      const data: ConfirmDialogData = { title: 'Test', message: 'Message' };
      const observable = service.confirm(data);

      const results: boolean[] = [];
      observable.subscribe(function captureResult(result) {
        results.push(result);
      });
      observable.subscribe(function captureResult(result) {
        results.push(result);
      });

      afterClosedSubject.next(true);
      afterClosedSubject.complete();

      expect(results).toEqual([true, true]);
    });

    it('should allow multiple dialogs to be opened sequentially', () => {
      const data1: ConfirmDialogData = { title: 'First', message: 'First msg' };
      const data2: ConfirmDialogData = {
        title: 'Second',
        message: 'Second msg',
      };

      service.confirm(data1);
      service.confirm(data2);

      expect(mockDialog.open).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty title', () => {
      const data: ConfirmDialogData = { title: '', message: 'Message' };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({ title: '' }),
        })
      );
    });

    it('should handle empty message', () => {
      const data: ConfirmDialogData = { title: 'Title', message: '' };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({ message: '' }),
        })
      );
    });

    it('should handle very long title and message', () => {
      const longText = 'A'.repeat(1000);
      const data: ConfirmDialogData = { title: longText, message: longText };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            title: longText,
            message: longText,
          }),
        })
      );
    });

    it('should handle special characters in text', () => {
      const data: ConfirmDialogData = {
        title: '<script>alert("xss")</script>',
        message: '&lt;html&gt; "quotes" \'single\'',
      };
      service.confirm(data);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            title: '<script>alert("xss")</script>',
            message: '&lt;html&gt; "quotes" \'single\'',
          }),
        })
      );
    });
  });
});
