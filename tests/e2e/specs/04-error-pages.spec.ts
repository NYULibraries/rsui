import { expect, test } from '@playwright/test';
import { login } from '../support/helpers';

test.describe('custom error pages', () => {
    test('a missing page shows the branded 404 experience', async ({ page }) => {
        const response = await page.goto('/does-not-exist');

        expect(response?.status()).toBe(404);
        await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
        await expect(page.getByText('The page or resource you requested could not be found.')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
    });

    test('an upstream failure shows the file service 502 experience', async ({ page }) => {
        await login(page);

        // The mock deliberately has no response for this path. Laravel translates
        // the upstream 404 into the application's 502 error page.
        const response = await page.goto('/fs/paths/unknown-resource');

        expect(response?.status()).toBe(502);
        await expect(page.getByRole('heading', { name: 'File service unavailable' })).toBeVisible();
        await expect(page.getByText(/file service is temporarily unavailable/i)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    });
});
