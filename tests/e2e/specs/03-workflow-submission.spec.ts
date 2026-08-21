import { expect, test } from '@playwright/test';
import { COLLECTION_ID, PARTNER_ID, login, mockRequests, resetMock } from '../support/helpers';

/**
 * Journey 3: submitting a workflow from the actions modal.
 */
test.describe('workflow submission', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await resetMock(page);
        await page.goto(`/paths/${PARTNER_ID}/${COLLECTION_ID}`);
    });

    /** Opens the actions dropdown for a given row. */
    const openActions = (page: import('@playwright/test').Page, rowText: string) =>
        page.getByRole('row').filter({ hasText: rowText }).getByRole('combobox').click();

    test('a video file offers the transcode workflow', async ({ page }) => {
        await openActions(page, 'video-sample.mp4');

        await expect(page.getByRole('option', { name: 'Transcode and Push' })).toBeVisible();
    });

    test('mime_types restrictions hide the workflow for non-matching files', async ({ page }) => {
        // notes.txt is text/plain, so the video-only transcode workflow must not appear.
        await openActions(page, 'notes.txt');

        await expect(page.getByRole('option', { name: 'Transcode and Push' })).toHaveCount(0);
    });

    test('opening the actions modal issues no extra network request', async ({ page }) => {
        // Regression guard: the dialog once fetched the item URL to load workflows, even
        // though the listing already provides them. That fetch returned a non-JSON body
        // and produced "JSON.parse: unexpected end of data" for users.
        const fsRequests: string[] = [];
        page.on('request', (request) => {
            if (request.url().includes('/fs/')) {
                fsRequests.push(request.url());
            }
        });

        await openActions(page, 'video-sample.mp4');
        await page.getByRole('option', { name: 'Transcode and Push' }).click();

        await expect(page.getByRole('dialog')).toBeVisible();
        expect(fsRequests).toHaveLength(0);
    });

    test('the modal shows the partner, collection and file path', async ({ page }) => {
        await openActions(page, 'video-sample.mp4');
        await page.getByRole('option', { name: 'Transcode and Push' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('E2E Partner')).toBeVisible();
        await expect(dialog.getByText('E2E Collection')).toBeVisible();
        await expect(dialog.getByRole('heading')).toHaveText(/^File$/);
        await expect(dialog.getByText('video-sample.mp4')).toBeVisible();
    });

    test('a user can submit a workflow and sees a confirmation toast', async ({ page }) => {
        await openActions(page, 'video-sample.mp4');
        await page.getByRole('option', { name: 'Transcode and Push' }).click();

        const dialog = page.getByRole('dialog');

        // Fill the required user-provided parameter.
        await dialog.getByRole('combobox').last().click();
        await page.getByRole('option', { name: 'mp4' }).click();

        await dialog.getByRole('button', { name: /submit/i }).click();

        await expect(page.getByText(/you will receive an email confirmation/i)).toBeVisible();

        // The backend must have received the job with the /fs prefix stripped.
        const requests = await mockRequests(page);
        const job = requests.find((r) => r.method === 'POST' && r.path === 'jobs');

        expect(job).toBeDefined();
        expect(job!.body).toContain('source_path');
        expect(job!.body).not.toContain('/fs/');
    });
});
