import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, of } from 'rxjs';

import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockDialog }],
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  it('should open dialog with provided data', () => {
    service.confirm({ title: 'Test', message: 'Confirm?' });
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should return observable of boolean', async () => {
    const result = await firstValueFrom(
      service.confirm({ title: 'Test', message: 'Confirm?' })
    );
    expect(result).toBe(true);
  });
});
