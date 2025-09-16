import { TestUser } from './test-user.interface';

export const TEST_USER: TestUser = {
  email: 'test@example.com',
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Test password for E2E tests
  password: 'TestPass123!',
};
