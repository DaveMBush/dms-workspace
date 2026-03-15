import { type Mock } from 'vitest';

interface NotificationServiceMock {
  success: Mock;
  error: Mock;
  info: Mock;
  warn: Mock;
  show: Mock;
}

export function createMockNotificationService(): NotificationServiceMock {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    show: vi.fn(),
  };
}
