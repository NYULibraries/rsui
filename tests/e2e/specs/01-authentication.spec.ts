import { expect, test } from '@playwright/test';
import { login } from '../support/helpers';

/**
 * Journey 1: authentication.
 *
 * Covers the RSBE login exchange, session persistence across requests, and logout.
 * The session-persistence assertion is deliberate: a regression here previously logged
 * users out on their second request, and a login-only test would not have caught it.
 */
test.describe('authentication', () => {
    test('a guest is redirected to the login page', async ({ page }) => {
        await page.goto('/dashboard');

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('heading', { name: /log in to your account/i })).toBeVisible();
    });

    test('the password visibility toggle has an accessible name', async ({ page }) => {
        await page.goto('/login');

        const toggle = page.getByRole('button', { name: 'Show password' });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('a user can log in and reach the dashboard', async ({ page }) => {
        await login(page);

        await expect(page).toHaveURL(/\/dashboard/);
        // The partners table is the dashboard's primary content.
        await expect(page.getByRole('columnheader', { name: 'Partner' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'E2E Partner' })).toBeVisible();
    });

    test('the session survives subsequent navigations', async ({ page }) => {
        await login(page);

        // Regression guard: the external auth cookie is re-read on every upstream call,
        // and an expiry parsed as null used to silently invalidate the session here.
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/dashboard/);

        await page.goto('/settings/profile');
        await expect(page).toHaveURL(/\/settings\/profile/);

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('invalid credentials are rejected', async ({ page }) => {
        await page.goto('/login');

        await page.locator('#email').fill('wrong@example.com');
        await page.locator('#password').fill('not-the-password');
        await page.getByRole('button', { name: 'Log in' }).click();

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });

    test('a user can log out', async ({ page }) => {
        await login(page);

        // The avatar menu trigger has no accessible name, so it is located by its
        // Radix dropdown-trigger attributes rather than by role+name.
        await page.locator('button[aria-haspopup="menu"]').last().click();
        await page.getByRole('menuitem', { name: /log out/i }).click();

        // Logout returns the user to the public welcome page.
        await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$|\/login/);

        // The session is genuinely gone, not merely navigated away from.
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});
