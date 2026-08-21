import { expect, type Page } from '@playwright/test';

export const USER = {
    email: 'e2e@example.com',
    password: 'e2e-password',
    username: 'E2E Test User',
};

export const PARTNER_ID = '2f096796-c685-444f-a4fe-5971346b159d';
export const COLLECTION_ID = '2983ae0a-64c7-4f29-88fc-784426340fae';

/** Base URL of the mock RS API, as reachable from the machine running Playwright. */
const MOCK_API = (process.env.E2E_MOCK_API_PUBLIC ?? 'http://127.0.0.1:9911').replace(/\/+$/, '') + '/';

/**
 * Logs in through the real UI.
 *
 * Deliberately not shortcut via storageState: the login exchange (RSBE call, cookie
 * extraction, local user mirroring) is itself a critical path worth exercising, and the
 * suite is small enough that the cost is negligible.
 *
 * Fields are targeted by id rather than label because the password field's visibility
 * toggle is an unlabelled button, which makes label-based lookups ambiguous.
 */
export async function login(page: Page): Promise<void> {
    await page.goto('/login');

    await page.locator('#email').fill(USER.email);
    await page.locator('#password').fill(USER.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL('**/dashboard');
}

/** Reads the requests recorded by the mock RS API. */
export async function mockRequests(page: Page): Promise<Array<{ method: string; path: string; query: string; body: string }>> {
    const res = await page.request.get(`${MOCK_API}__mock/requests`);
    expect(res.ok()).toBeTruthy();
    return res.json();
}

/** Clears the mock RS API request log so a spec can assert on only its own traffic. */
export async function resetMock(page: Page): Promise<void> {
    await page.request.get(`${MOCK_API}__mock/reset`);
}
