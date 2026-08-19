import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';

const testLogFilename = 'test-e2e-error.log';
// Use NX_WORKSPACE_ROOT_PATH when set (worktree dev) so the file lands where the
// server is running from; fall back to __dirname resolution for CI.
const workspaceRoot =
  process.env['NX_WORKSPACE_ROOT_PATH'] ?? path.resolve(__dirname, '../../../');
const logsDir = path.join(workspaceRoot, 'logs');
const testLogPath = path.join(logsDir, testLogFilename);
const testLogDisplayName = 'test e2e error';

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
      page.locator('mat-toolbar', { hasText: 'Error Logs' }),
    ).toBeVisible();
  });
});

test.describe('Error Logs Screen', function describeErrorLogsScreen() {
  test.afterAll(function cleanupTestLogFiles() {
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  test.beforeEach(async function ensureTestFileAndNavigate({ page }) {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(testLogPath, 'Test error log content for E2E\n', 'utf8');
    await login(page);
    await page.goto('/global/error-logs');
    await expect(page.locator('mat-spinner')).not.toBeVisible({
      timeout: 15000,
    });
  });

  test('renders file-viewer component with at least one log file', async function testFileViewerRenders({
    page,
  }) {
    await expect(page.getByText(testLogDisplayName)).toBeVisible();
    await expect(page.getByText('Error Log Summary')).not.toBeVisible();
    await expect(page.getByText('No error log files found.')).not.toBeVisible();
  });

  test('deletes a log file and removes it from list', async function testDeleteLogFile({
    page,
  }) {
    await expect(page.getByText(testLogDisplayName)).toBeVisible();

    await page
      .getByRole('button', { name: `Delete ${testLogDisplayName}` })
      .click();

    await expect(page.getByText(testLogDisplayName)).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('alert')).not.toBeVisible();
  });
});
