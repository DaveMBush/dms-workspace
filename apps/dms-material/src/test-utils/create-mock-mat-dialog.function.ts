import { of } from 'rxjs';
import { type Mock } from 'vitest';

interface MatDialogMock {
  open: Mock;
}

export function createMockMatDialog(): MatDialogMock {
  return {
    open: vi.fn().mockReturnValue({
      afterClosed: function afterClosed() {
        return of(null);
      },
    }),
  };
}
