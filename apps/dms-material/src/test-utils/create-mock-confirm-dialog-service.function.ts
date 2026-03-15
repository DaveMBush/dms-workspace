import { of } from 'rxjs';
import { type Mock } from 'vitest';

interface ConfirmDialogServiceMock {
  confirm: Mock;
}

export function createMockConfirmDialogService(): ConfirmDialogServiceMock {
  return {
    confirm: vi.fn().mockReturnValue(of(true)),
  };
}
