/**
 * Fixture data for the mock RS API.
 *
 * Shapes mirror what `ExternalApiService` and the React components actually consume.
 * Notably, `getPath()` rewrites `url`/`download_url` on each child by string-replacing
 * the configured endpoint, so children must carry ABSOLUTE urls prefixed with the mock
 * endpoint or the rewrite silently no-ops.
 */

export const PARTNER_ID = '2f096796-c685-444f-a4fe-5971346b159d';
export const COLLECTION_ID = '2983ae0a-64c7-4f29-88fc-784426340fae';

export const USER = {
    email: 'e2e@example.com',
    password: 'e2e-password',
    username: 'E2E Test User',
};

export const partner = {
    id: PARTNER_ID,
    name: 'E2E Partner',
    code: 'e2ep',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
};

export const collection = {
    id: COLLECTION_ID,
    partner_id: PARTNER_ID,
    name: 'E2E Collection',
    code: 'wip',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
};

/**
 * Workflows advertised on listings via `?include=workflows`.
 *
 * Shapes match the `Workflow` interface in resources/js/types/index.d.ts:
 * `workflow_id` / `description` / `applies_to` / `parameters[].provided_by`.
 *
 * `transcode-and-push` carries a mime_types restriction so the E2E run exercises the
 * applies_to / mime_types filtering, which has no other automated coverage.
 */
export const fileWorkflows = [
    {
        workflow_id: 'transcode_and_push',
        version: '1.0.0',
        description: 'Transcode and Push',
        applies_to: {
            object_types: ['file'],
            mime_types: ['video/mp4', 'video/quicktime'],
        },
        parameters: [
            { name: 'source_path', provided_by: 'context', binding: 'url' },
            {
                name: 'target_format',
                provided_by: 'user',
                label: 'Target format',
                type: 'select',
                required: true,
                options: [{ value: 'mp4' }, { value: 'webm' }],
            },
            { name: 'notes', provided_by: 'user', label: 'Notes', type: 'string', required: false },
        ],
    },
];

export const directoryWorkflows = [
    {
        workflow_id: 'validate_directory',
        version: '1.0.0',
        description: 'Validate Directory',
        applies_to: { object_types: ['directory'] },
        parameters: [{ name: 'source_path', provided_by: 'context', binding: 'url' }],
    },
];

/** Matches the AvailableWorkflows interface: keyed by object type. */
export const availableWorkflows = {
    file: fileWorkflows,
    directory: directoryWorkflows,
};

/**
 * Builds a directory listing. `endpoint` is injected so child urls are absolute and
 * survive the service's endpoint -> /fs rewrite.
 */
export function buildListing(endpoint) {
    const base = `${endpoint}paths/${PARTNER_ID}/${COLLECTION_ID}`;

    return {
        name: 'wip',
        object_type: 'directory',
        display_size: '',
        size: 0,
        last_modified: '2024-02-01T10:00:00Z',
        url: base,
        available_workflows: availableWorkflows,
        children: [
            {
                name: 'video-sample.mp4',
                object_type: 'file',
                extension: 'mp4',
                mime_type: 'video/mp4',
                display_size: '12.4 MB',
                size: 13002342,
                last_modified: '2024-02-02T11:00:00Z',
                url: `${base}/video-sample.mp4`,
                download_url: `${base}/video-sample.mp4`,
                preview: false,
                available_workflows: availableWorkflows,
            },
            {
                name: 'notes.txt',
                object_type: 'file',
                extension: 'txt',
                mime_type: 'text/plain',
                display_size: '1.2 KB',
                size: 1229,
                last_modified: '2024-02-03T12:00:00Z',
                url: `${base}/notes.txt`,
                download_url: `${base}/notes.txt`,
                preview: true,
                available_workflows: availableWorkflows,
            },
            {
                name: 'subdir',
                object_type: 'directory',
                display_size: '',
                size: 0,
                last_modified: '2024-02-04T13:00:00Z',
                url: `${base}/subdir`,
                available_workflows: availableWorkflows,
            },
        ],
    };
}

export function buildSubdirListing(endpoint) {
    const base = `${endpoint}paths/${PARTNER_ID}/${COLLECTION_ID}/subdir`;

    return {
        name: 'subdir',
        object_type: 'directory',
        display_size: '',
        size: 0,
        last_modified: '2024-02-04T13:00:00Z',
        url: base,
        available_workflows: availableWorkflows,
        children: [
            {
                name: 'nested.txt',
                object_type: 'file',
                extension: 'txt',
                mime_type: 'text/plain',
                display_size: '300 B',
                size: 300,
                last_modified: '2024-02-05T14:00:00Z',
                url: `${base}/nested.txt`,
                download_url: `${base}/nested.txt`,
                preview: true,
                available_workflows: availableWorkflows,
            },
        ],
    };
}

export const NOTES_TXT_CONTENT = 'Hello from the mock RS API preview endpoint.';

export function buildSearchResults(term, page = 1) {
    const perPage = 10;
    const total = 23;
    const start = (page - 1) * perPage;
    const results = Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_, i) => {
        const n = start + i + 1;
        return {
            id: `result-${n}`,
            name: `${term} result ${n}`,
            title: `${term} result ${n}`,
            object_type: 'file',
            mime_type: 'text/plain',
            url: `/paths/${PARTNER_ID}/${COLLECTION_ID}/wip/result-${n}.txt`,
            partner_id: PARTNER_ID,
            collection_id: COLLECTION_ID,
        };
    });

    return {
        data: results,
        meta: { current_page: page, last_page: Math.ceil(total / perPage), per_page: perPage, total },
    };
}
