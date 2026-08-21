import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for RS UI end-to-end smoke tests.
 *
 * These tests run against a real Laravel instance backed by a mock RS API
 * (tests/e2e/mock-api). The mock keeps runs hermetic: the real upstream is neither
 * required nor contacted, so the suite is safe for CI and cannot mutate real data.
 *
 * The web server is NOT started by Playwright, because the app must be served by ddev
 * with e2e-specific environment configuration. Use `scripts/e2e.sh`, which wires the
 * mock API, environment, and server together before invoking this config.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'https://rsui.ddev.site:33001';

export default defineConfig({
    testDir: './tests/e2e/specs',
    // Smoke tests describe user journeys; each is a few navigations, so this is ample.
    timeout: 60_000,
    expect: { timeout: 10_000 },

    // Journeys share one Laravel instance and one mock API that records submissions,
    // so run serially to keep assertions on recorded state unambiguous.
    fullyParallel: false,
    workers: 1,

    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,

    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : [['list'], ['html', { open: 'never' }]],

    outputDir: './tests/e2e/.artifacts',

    use: {
        baseURL,
        // ddev serves a locally-signed certificate.
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15_000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
