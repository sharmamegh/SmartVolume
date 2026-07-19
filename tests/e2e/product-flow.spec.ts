import { expect, test } from '@playwright/test';

test('onboards, navigates, and persists privacy settings', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Sound guidance without recording you/i })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: /Analyze for 5 seconds/i })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  const diagnostics = page.getByRole('switch', { name: 'Share anonymous diagnostics' });
  await expect(diagnostics).toHaveAttribute('aria-checked', 'false');
  await diagnostics.click();
  await expect(diagnostics).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Settings saved.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Share anonymous diagnostics' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Privacy' }).click();
  await expect(page.getByText(/Raw audio is not stored/i)).toBeVisible();
});

test('shows microphone denial without leaving an active session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Analyze for 5 seconds/i }).click();
  await expect(page.getByRole('alert')).toContainText('Permission denied');
  await expect(page.getByRole('button', { name: /Analyze for 5 seconds/i })).toBeVisible();
});
