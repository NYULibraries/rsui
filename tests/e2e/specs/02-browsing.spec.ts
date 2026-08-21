import { expect, test } from '@playwright/test';
import { COLLECTION_ID, PARTNER_ID, login } from '../support/helpers';

/**
 * Journey 2: dashboard -> partner -> collection -> directory browsing.
 *
 * This is the application's primary path and exercises the Laravel -> RS API proxy,
 * Inertia navigation, and the FileExplorer table.
 */
test.describe('browsing partners, collections and files', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('a user can navigate from the dashboard to a collection listing', async ({ page }) => {
        await expect(page.getByRole('cell', { name: 'E2E Partner' })).toBeVisible();

        await page.getByRole('link', { name: 'E2E Partner' }).click();
        await expect(page).toHaveURL(new RegExp(`/partners/${PARTNER_ID}`));
        await expect(page.getByRole('cell', { name: 'E2E Collection' })).toBeVisible();

        await page.getByRole('link', { name: 'E2E Collection' }).click();
        await expect(page).toHaveURL(/\/(collections|paths)\//);

        // The file listing served by the mock RS API.
        await expect(page.getByRole('cell', { name: 'video-sample.mp4' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'notes.txt' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'subdir', exact: true })).toBeVisible();
    });

    test('the file table renders a complete row for both files and directories', async ({ page }) => {
        await page.goto(`/paths/${PARTNER_ID}/${COLLECTION_ID}`);

        const headerCount = await page.locator('table thead th').count();
        expect(headerCount).toBeGreaterThan(0);

        // Regression guard: directory rows previously omitted the Size cell, which
        // shifted every subsequent column left by one.
        const fileRow = page.getByRole('row').filter({ hasText: 'video-sample.mp4' });
        const dirRow = page.getByRole('row').filter({ hasText: 'subdir' });

        await expect(fileRow.locator('td')).toHaveCount(headerCount);
        await expect(dirRow.locator('td')).toHaveCount(headerCount);

        // The directory's Size cell must exist even when the value is blank.
        await expect(fileRow.getByText('12.4 MB')).toBeVisible();
    });

    test('a user can browse into a subdirectory', async ({ page }) => {
        await page.goto(`/paths/${PARTNER_ID}/${COLLECTION_ID}`);

        // Click the name cell specifically: the Actions cell stops propagation, and a
        // click on the row's centre would land there rather than triggering navigation.
        await page.getByRole('cell', { name: 'subdir', exact: true }).click();

        await expect(page.getByRole('cell', { name: 'nested.txt' })).toBeVisible();
    });

    test('a directory can be opened with the keyboard', async ({ page }) => {
        await page.goto(`/paths/${PARTNER_ID}/${COLLECTION_ID}`);

        const directory = page.getByRole('row').filter({ hasText: 'subdir' });
        await directory.focus();
        await directory.press('Enter');

        await expect(page.getByRole('cell', { name: 'nested.txt' })).toBeVisible();
    });

    test('an unknown collection shows a recoverable error state', async ({ page }) => {
        const response = await page.goto('/collections/11111111-1111-4111-8111-111111111111');

        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { name: 'Collection unavailable' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Return to partners' })).toBeVisible();
    });
});
