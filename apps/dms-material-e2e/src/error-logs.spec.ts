import * as fs from 'fs';
import * as path from 'path';

import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const TEST_LOG_FILENAME = 'test-e2e-error.log';
// Use NX_WORKSPACE_ROOT_PATH when set (worktree dev) so the file lands where the
// server is running from; fall back to __dirname resolution for CI.
const WORKSPACE_ROOT =
  process.env['NX_WORKSPACE_ROOT_PATH'] ?? path.resolve(__dirname, '../../../');
const LOGS_DIR = path.join(WORKSPACE_ROOT, 'logs');
const TEST_LOG_PATH = path.join(LOGS_DIR, TEST_LOG_FILENAME);
const TEST_LOG_DISPLAY_NAME = 'test e2e error';

test.describe('Error Logs Navigation', () => {
  test.beforeEach(async function loginBeforeEach({ page }) {
    await login(page);
  });

  test('navigates to error logs page via nav link', async function navigateToErrorLogs({
    page,
  }) {
    const navLink = page.locator('[data-testid="global-nav-error-logs"]');
    await navLink.click();

    await expect(page).toHaveURL(/\/global\/error-logs$/);
    await expect(
      page.locator('mat-toolbar', { hasText: 'Error Logs' })
    ).toBeVisible();
  });
});

test.describe('Error Logs Screen', function describeErrorLogsScreen() {
  test.afterAll(function cleanupTestLogFiles() {
    if (fs.existsSync(TEST_LOG_PATH)) {
      fs.unlinkSync(TEST_LOG_PATH);
    }
  });

  test.beforeEach(async function ensureTestFileAndNavigate({ page }) {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    fs.writeFileSync(TEST_LOG_PATH, 'Test error log content for E2E\n', 'utf8');
    await login(page);
    await page.goto('/global/error-logs');
    await expect(page.locator('mat-spinner')).not.toBeVisible({
      timeout: 15000,
    });
  });

  test('renders file-viewer component with at least one log file', async function testFileViewerRenders({
    page,
  }) {
    await expect(page.getByText(TEST_LOG_DISPLAY_NAME)).toBeVisible();
    await expect(page.getByText('Error Log Summary')).not.toBeVisible();
    await expect(page.getByText('No error log files found.')).not.toBeVisible();
  });

  test('deletes a log file and removes it from list', async function testDeleteLogFile({
    page,
  }) {
    await expect(page.getByText(TEST_LOG_DISPLAY_NAME)).toBeVisible();

    await page
      .getByRole('button', { name: `Delete ${TEST_LOG_DISPLAY_NAME}` })
      .click();

    await expect(page.getByText(TEST_LOG_DISPLAY_NAME)).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('alert')).not.toBeVisible();
  });
});
