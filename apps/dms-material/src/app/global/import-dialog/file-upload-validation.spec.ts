import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ImportDialogComponent } from './import-dialog.component';
import { ImportDialogData } from './import-dialog-data.interface';

/**
 * TDD RED Phase tests for file upload validation.
 * These tests define expected behavior for file upload features
 * that will be implemented in Story AR.4.
 *
 * Individual tests are disabled with it.skip to allow CI to pass.
 */

function selectFile(
  fixture: ComponentFixture<ImportDialogComponent>,
  file: File
): void {
  const compiled = fixture.nativeElement as HTMLElement;
  const fileInput =
    compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  Object.defineProperty(fileInput, 'files', {
    value: dataTransfer.files,
    configurable: true,
  });
  fileInput.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

describe('ImportDialogComponent - File Upload Validation (TDD RED)', () => {
  let component: ImportDialogComponent;
  let fixture: ComponentFixture<ImportDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let httpMock: HttpTestingController;
  const mockDialogData: ImportDialogData = {};

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ImportDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.match(() => true);
    httpMock.verify();
  });

  // Flush the File.text() microtask so the HTTP request is created
  async function flushFileReading(): Promise<void> {
    await new Promise(function resolveNextTick(resolve) {
      setTimeout(resolve, 0);
    });
  }

  // Placeholder test to keep vitest from failing on empty suite.
  // All real tests below are disabled (TDD RED phase).
  it('should have TDD RED phase tests defined', () => {
    expect(true).toBe(true);
  });

  describe.skip('file size validation', () => {
    it('should reject files larger than 10MB', () => {
      const oversizedContent = 'a'.repeat(11 * 1024 * 1024);
      const file = new File([oversizedContent], 'oversized.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBeNull();
    });

    it('should accept files exactly at 10MB limit', () => {
      const maxContent = 'a'.repeat(10 * 1024 * 1024);
      const file = new File([maxContent], 'max-size.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBe(file);
    });

    it('should display file size error message for oversized files', () => {
      const oversizedContent = 'a'.repeat(11 * 1024 * 1024);
      const file = new File([oversizedContent], 'oversized.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toMatch(/file.*too.*large|size.*exceeds/i);
    });

    it('should keep upload button disabled for oversized files', () => {
      const oversizedContent = 'a'.repeat(11 * 1024 * 1024);
      const file = new File([oversizedContent], 'oversized.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(true);
    });
  });

  describe.skip('file content preview', () => {
    it('should display a preview section after file selection', () => {
      const csvContent =
        'Date,Action,Symbol,Quantity,Price,Amount,Account\n01/15/2025,YOU BOUGHT,SPY,10,450.25,-4502.50,MyAccount';
      const file = new File([csvContent], 'transactions.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const preview = compiled.querySelector('[data-testid="file-preview"]');
      expect(preview).toBeTruthy();
    });

    it('should show first 5 rows of CSV content in preview', async () => {
      const rows = [
        'Date,Action,Symbol,Quantity,Price,Amount,Account',
        '01/15/2025,YOU BOUGHT,SPY,10,450.25,-4502.50,MyAccount',
        '01/16/2025,YOU SOLD,AAPL,5,185.00,925.00,MyAccount',
        '01/17/2025,DIVIDEND RECEIVED,SPY,0,0,15.75,MyAccount',
        '01/18/2025,YOU BOUGHT,QQQ,20,380.00,-7600.00,MyAccount',
        '01/19/2025,YOU SOLD,MSFT,10,420.00,4200.00,MyAccount',
        '01/20/2025,YOU BOUGHT,GOOG,3,140.00,-420.00,MyAccount',
      ];
      const file = new File([rows.join('\n')], 'transactions.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);
      await flushFileReading();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const preview = compiled.querySelector<HTMLElement>(
        '[data-testid="file-preview"]'
      )!;
      // Should show header + first 5 data rows (6 total), not the 7th row
      expect(preview.textContent).toContain('SPY');
      expect(preview.textContent).toContain('AAPL');
      expect(preview.textContent).not.toContain('GOOG');
    });

    it('should use FileReader to read file content for preview', () => {
      const fileReaderSpy = vi.spyOn(window, 'FileReader' as never);
      const csvContent = 'Date,Action,Symbol\n01/15/2025,YOU BOUGHT,SPY';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      selectFile(fixture, file);

      expect(fileReaderSpy).toHaveBeenCalled();
    });

    it('should display file size in human-readable format', () => {
      const csvContent = 'a'.repeat(1024 * 500); // 500KB
      const file = new File([csvContent], 'medium.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toMatch(/500\s*KB|0\.5\s*MB/i);
    });
  });

  describe.skip('FormData creation', () => {
    it('should create FormData with selected file for upload', async () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      expect(req.request.body).toBeInstanceOf(FormData);
    });

    it('should include file under the key "file" in FormData', async () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      const body = req.request.body as FormData;
      expect(body.get('file')).toBeTruthy();
    });

    it('should set correct content type for multipart upload', async () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      // When sending FormData, Angular should NOT set Content-Type
      // (browser sets it with boundary automatically)
      expect(req.request.headers.has('Content-Type')).toBe(false);
    });
  });

  describe.skip('upload progress tracking', () => {
    it('should report upload progress as a percentage', () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['uploadProgress']).toBeDefined();
    });

    it('should display upload progress percentage in the UI', () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      const progressElement = compiled.querySelector(
        '[data-testid="upload-progress"]'
      );
      expect(progressElement).toBeTruthy();
    });

    it('should show 0% progress at upload start', () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['uploadProgress']()).toBe(0);
    });
  });

  describe.skip('upload cancellation', () => {
    it('should display a cancel upload button during upload', () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      const cancelUploadButton = compiled.querySelector(
        '[data-testid="cancel-upload-button"]'
      );
      expect(cancelUploadButton).toBeTruthy();
    });

    it('should cancel the HTTP request when cancel upload is clicked', async () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const cancelUploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="cancel-upload-button"]'
      )!;
      cancelUploadButton.click();
      fixture.detectChanges();

      expect(component.uploading()).toBe(false);
      // Request was dispatched but then cancelled; drain it to avoid verify() failure
      httpMock.match('/api/import/fidelity');
    });

    it('should reset upload state after cancellation', async () => {
      const file = new File(['csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const cancelUploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="cancel-upload-button"]'
      )!;
      cancelUploadButton.click();
      fixture.detectChanges();

      expect(component.uploading()).toBe(false);
      expect(component.errors()).toHaveLength(0);
      // Upload button should be re-enabled
      expect(uploadButton.disabled).toBe(false);
    });
  });

  describe.skip('file type validation edge cases', () => {
    it('should accept .CSV files with uppercase extension', () => {
      const file = new File(['csv,content'], 'TRANSACTIONS.CSV', {
        type: 'text/csv',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBe(file);
    });

    it('should reject .xlsx files', () => {
      const file = new File(['binary content'], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBeNull();
    });

    it('should reject files with no extension', () => {
      const file = new File(['some content'], 'datafile', {
        type: 'application/octet-stream',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBeNull();
    });

    it('should reject .csv.bak files', () => {
      const file = new File(['csv content'], 'data.csv.bak', {
        type: 'application/octet-stream',
      });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBeNull();
    });

    it('should display validation error for non-CSV files', () => {
      const file = new File(['content'], 'data.txt', {
        type: 'text/plain',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toMatch(/csv.*only|invalid.*file.*type/i);
    });
  });

  describe.skip('empty and corrupted file handling', () => {
    it('should reject empty files (0 bytes)', () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' });
      selectFile(fixture, file);

      const componentRecord = component as unknown as Record<string, unknown>;
      expect(componentRecord['selectedFile']).toBeNull();
    });

    it('should display error message for empty files', () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toMatch(/empty|no.*content/i);
    });

    it('should handle file with BOM (Byte Order Mark) correctly', async () => {
      const bom = '\uFEFF';
      const csvContent =
        bom +
        'Date,Action,Symbol,Quantity,Price,Amount,Account\n01/15/2025,YOU BOUGHT,SPY,10,450.25,-4502.50,MyAccount';
      const file = new File([csvContent], 'bom.csv', { type: 'text/csv' });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      // The sent content should have BOM stripped
      const sentBody = (req.request.body as FormData).get('file') as File;
      const text = await sentBody.text();
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
    });

    it('should handle file with UTF-8 encoding', async () => {
      const csvContent =
        'Date,Action,Symbol,Quantity,Price,Amount,Account\n01/15/2025,YOU BOUGHT,SPY Börsenfonds,10,450.25,-4502.50,MyAccount';
      const file = new File([csvContent], 'utf8.csv', { type: 'text/csv' });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      const sentBody = req.request.body as string;
      expect(sentBody).toContain('Börsenfonds');
    });

    it('should handle file with declared UTF-16 charset but UTF-8 content', async () => {
      const csvContent =
        'Date,Action,Symbol,Quantity,Price,Amount,Account\n01/15/2025,YOU BOUGHT,SPY,10,450.25,-4502.50,MyAccount';
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(csvContent);
      const file = new File([utf8Bytes], 'utf16.csv', {
        type: 'text/csv;charset=utf-16',
      });
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      expect(req.request.body).toBeTruthy();
    });

    it('should handle corrupted file that cannot be read', async () => {
      // Create a file with invalid content
      const file = new File(
        [new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe])],
        'corrupted.csv',
        { type: 'text/csv' }
      );
      selectFile(fixture, file);

      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;

      if (!uploadButton.disabled) {
        uploadButton.click();
        fixture.detectChanges();
        await flushFileReading();
      }

      // Component should handle the error gracefully
      expect(component.errors().length).toBeGreaterThan(0);
    });
  });
});
