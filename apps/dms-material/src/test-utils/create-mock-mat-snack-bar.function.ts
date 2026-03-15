import { type Mock } from 'vitest';

interface MatSnackBarMock {
  open: Mock;
}

export function createMockMatSnackBar(): MatSnackBarMock {
  return {
    open: vi.fn(),
  };
}
