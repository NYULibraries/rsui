/**
 * Standalone entrypoint for the mock RS API.
 *
 * Run inside the ddev web container so Laravel can reach it on localhost:
 *   node tests/e2e/mock-api/start.mjs
 *
 * Port and public endpoint are supplied via env so the value baked into fixture URLs
 * matches exactly what `ExternalApiService` has configured — the service rewrites child
 * urls by string-replacing the endpoint, so any mismatch silently breaks navigation.
 */

import { createMockApi } from './server.mjs';

const port = Number(process.env.MOCK_API_PORT ?? 9911);
const endpoint = process.env.MOCK_API_ENDPOINT ?? `http://127.0.0.1:${port}/`;

const server = createMockApi({ endpoint });

server.listen(port, '0.0.0.0', () => {
    console.log(`[mock-rs-api] listening on ${port} (endpoint ${endpoint})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
