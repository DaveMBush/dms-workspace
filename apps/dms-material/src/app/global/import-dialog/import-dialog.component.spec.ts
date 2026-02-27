import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ImportDialogComponent } from './import-dialog.component';
import { ImportDialogData } from './import-dialog-data.interface';

describe('ImportDialogComponent', () => {
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
    // Discard any outstanding requests left by tests that
    // intentionally check intermediate loading state.
    httpMock.match(() => true);
    httpMock.verify();
  });

  // Flush the File.text() microtask so the HTTP request is created
  async function flushFileReading(): Promise<void> {
    await new Promise(function resolveNextTick(resolve) {
      setTimeout(resolve, 0);
    });
  }

  describe('dialog initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should display dialog title "Import Fidelity Transactions"', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('[mat-dialog-title], h2')!;
      expect(title.textContent).toContain('Import Fidelity Transactions');
    });

    it('should have mat-dialog-content element', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const content = compiled.querySelector('mat-dialog-content');
      expect(content).toBeTruthy();
    });

    it('should have mat-dialog-actions element', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const actions = compiled.querySelector('mat-dialog-actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('file input rendering', () => {
    it('should render a file input element', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput = compiled.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
    });

    it('should allow file selection (validated by JavaScript)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      // No accept attribute - all files shown, CSV validation in onFileSelected()
      expect(fileInput.accept).toBe('');
    });

    it('should display file selection label or instructions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const text = compiled.textContent;
      expect(text).toMatch(/select|choose|csv/i);
    });
  });

  describe('file selection handling', () => {
    it('should update selected file when a file is chosen', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      const file = new File(['test,csv,content'], 'test.csv', {
        type: 'text/csv',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect((component as Record<string, unknown>)['selectedFile']).toBe(file);
    });

    it('should display selected file name after selection', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      const file = new File(['content'], 'transactions.csv', {
        type: 'text/csv',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(compiled.textContent).toContain('transactions.csv');
    });
  });

  describe('upload button enablement', () => {
    it('should have upload button disabled initially when no file selected', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(true);
    });

    it('should enable upload button after a file is selected', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(false);
    });
  });

  describe('cancel button', () => {
    it('should have a cancel button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelButton = compiled.querySelector(
        '[data-testid="cancel-button"]'
      );
      expect(cancelButton).toBeTruthy();
    });

    it('should close the dialog when cancel is clicked', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="cancel-button"]'
      )!;
      cancelButton.click();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should close the dialog with no result on cancel', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="cancel-button"]'
      )!;
      cancelButton.click();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('progress indicator during upload', () => {
    it('should not show progress spinner initially', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const spinner = compiled.querySelector(
        'mat-spinner, mat-progress-spinner'
      );
      expect(spinner).toBeFalsy();
    });

    it('should show progress spinner during upload', () => {
      // Arrange: select a file and trigger upload
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Act: click upload
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      // Assert: spinner visible while request is pending
      const spinner = compiled.querySelector(
        'mat-spinner, mat-progress-spinner'
      );
      expect(spinner).toBeTruthy();
    });

    it('should disable upload button during upload', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();

      expect(uploadButton.disabled).toBe(true);
    });
  });

  describe('success message display', () => {
    it('should display success message with import count after successful upload', async () => {
      // Arrange: select file and trigger upload
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      // Act: respond with success
      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: true,
        imported: 15,
        errors: [],
        warnings: [],
      });
      fixture.detectChanges();

      // Assert: success message visible
      const resultArea = compiled.querySelector<HTMLElement>(
        '[data-testid="import-result"]'
      )!;
      expect(resultArea.textContent).toContain('15');
      expect(resultArea.textContent).toMatch(/success|imported/i);
    });

    it('should hide spinner after successful upload', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: true,
        imported: 5,
        errors: [],
        warnings: [],
      });
      fixture.detectChanges();

      const spinner = compiled.querySelector(
        'mat-spinner, mat-progress-spinner'
      );
      expect(spinner).toBeFalsy();
    });
  });

  describe('error message display', () => {
    it('should display error messages when import fails', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: false,
        imported: 0,
        errors: ['Invalid CSV format', 'Missing required columns'],
        warnings: [],
      });
      fixture.detectChanges();

      const resultArea = compiled.querySelector<HTMLElement>(
        '[data-testid="import-result"]'
      )!;
      expect(resultArea.textContent).toContain('Invalid CSV format');
      expect(resultArea.textContent).toContain('Missing required columns');
    });

    it('should display error icon or styling on failure', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: false,
        imported: 0,
        errors: ['Parse error'],
        warnings: [],
      });
      fixture.detectChanges();

      const errorIcon = compiled.querySelector('mat-icon[color="warn"]');
      expect(errorIcon).toBeTruthy();
    });
  });

  describe('dialog close on success', () => {
    it('should close dialog automatically after successful import', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: true,
        imported: 10,
        errors: [],
        warnings: [],
      });
      fixture.detectChanges();

      expect(mockDialogRef.close).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should not close dialog automatically on error', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: false,
        imported: 0,
        errors: ['Failed'],
        warnings: [],
      });
      fixture.detectChanges();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('dialog data passing', () => {
    it('should receive dialog data via MAT_DIALOG_DATA injection', () => {
      // The component should be able to access injected data
      expect(component).toBeTruthy();
    });

    it('should pass account filter from dialog data when available', async () => {
      // Reset with dialog data containing account filter
      const dataWithAccount: ImportDialogData = {
        accountFilter: 'account-123',
      };

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ImportDialogComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: MAT_DIALOG_DATA, useValue: dataWithAccount },
          { provide: MatDialogRef, useValue: mockDialogRef },
        ],
      }).compileComponents();

      // Re-capture httpMock so afterEach verify() uses the fresh instance
      httpMock = TestBed.inject(HttpTestingController);

      const newFixture = TestBed.createComponent(ImportDialogComponent);
      const newComponent = newFixture.componentInstance as Record<
        string,
        unknown
      >;
      newFixture.detectChanges();

      // Component should have access to the account filter
      expect(newComponent['data']).toEqual(
        expect.objectContaining({ accountFilter: 'account-123' })
      );
    });
  });

  describe('edge cases', () => {
    it('should reject non-CSV files', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      const file = new File(['not csv'], 'test.txt', {
        type: 'text/plain',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Upload button should remain disabled for non-CSV files
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(true);
    });

    it('should handle empty file selection gracefully', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      // Trigger change with no files
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(true);
    });

    it('should display error when upload HTTP request fails', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      // Simulate HTTP error
      const req = httpMock.expectOne('/api/import/fidelity');
      req.error(new ProgressEvent('error'), {
        status: 500,
        statusText: 'Internal Server Error',
      });
      fixture.detectChanges();

      const resultArea = compiled.querySelector<HTMLElement>(
        '[data-testid="import-result"]'
      )!;
      expect(resultArea.textContent).toMatch(/error|failed/i);
    });

    it('should display error on network failure', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      // Simulate network error (status 0)
      const req = httpMock.expectOne('/api/import/fidelity');
      req.error(new ProgressEvent('error'), {
        status: 0,
        statusText: 'Unknown Error',
      });
      fixture.detectChanges();

      const resultArea = compiled.querySelector<HTMLElement>(
        '[data-testid="import-result"]'
      )!;
      expect(resultArea.textContent).toMatch(/network|connection|error/i);
    });

    it('should handle large file selection without crashing', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;

      // Create a large file (simulate with a large string)
      const largeContent = 'a'.repeat(10 * 1024 * 1024); // 10MB
      const file = new File([largeContent], 'large.csv', {
        type: 'text/csv',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Component should handle the large file without error
      expect(component).toBeTruthy();
      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      expect(uploadButton.disabled).toBe(false);
    });

    it('should display warnings from import result', async () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fileInput =
        compiled.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const uploadButton = compiled.querySelector<HTMLButtonElement>(
        '[data-testid="upload-button"]'
      )!;
      uploadButton.click();
      fixture.detectChanges();
      await flushFileReading();

      const req = httpMock.expectOne('/api/import/fidelity');
      req.flush({
        success: true,
        imported: 8,
        errors: [],
        warnings: ['Skipped 2 duplicate transactions'],
      });
      fixture.detectChanges();

      const resultArea = compiled.querySelector<HTMLElement>(
        '[data-testid="import-result"]'
      )!;
      expect(resultArea.textContent).toContain(
        'Skipped 2 duplicate transactions'
      );
    });
  });
});
