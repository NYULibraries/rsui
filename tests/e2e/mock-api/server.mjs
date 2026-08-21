/**
 * Mock RS API server for end-to-end tests.
 *
 * The app proxies every domain request through `ExternalApiService` server-side (PHP),
 * so browser-level request interception cannot stub this data. Instead we run a real
 * HTTP server and point `RS_V1_ENDPOINT` at it, which keeps the E2E run hermetic and
 * deterministic while still exercising the genuine Laravel -> HTTP -> Inertia path.
 *
 * It also records submitted workflow jobs so specs can assert on what the backend
 * actually received (notably the `source_path` rewrite).
 */

import { createServer } from 'node:http';
import {
    COLLECTION_ID,
    NOTES_TXT_CONTENT,
    PARTNER_ID,
    USER,
    buildListing,
    buildSearchResults,
    buildSubdirListing,
    collection,
    partner,
} from './fixtures.mjs';

const AUTH_COOKIE_VALUE = 'e2e-mock-authorization-cookie';

/** One hour, matching a plausible RSBE session lifetime. */
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * Builds the `Set-Cookie` header for the Authorization cookie.
 *
 * Every authenticated response re-sends this, which mirrors real RSBE behaviour and is
 * REQUIRED for the app to stay logged in: `ExternalApiService::updateAuthCookieFromResponse`
 * re-reads the cookie jar after each call and writes `external_auth_expires` from it.
 * Because `Http::withCookies()` seeds that same jar with the cookie the app just SENT
 * (which carries no Expires), a response that omits Set-Cookie causes the app to persist
 * a null expiry and log the user out on the next request.
 */
function authCookieHeader() {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    return `Authorization=${AUTH_COOKIE_VALUE}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; Expires=${expiresAt.toUTCString()}`;
}

/** Requests seen by the mock, exposed via GET /__mock/requests for assertions. */
const received = [];

function json(res, status, body, extraHeaders = {}) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        // Refresh the auth cookie on every response, as the real API does.
        'Set-Cookie': authCookieHeader(),
        ...extraHeaders,
    });
    res.end(payload);
}

function readBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => resolve(data));
    });
}

export function createMockApi({ endpoint }) {
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname.replace(/^\/+/, '');
        const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : '';

        received.push({ method: req.method, path, query: url.search, body });

        // --- Test-support endpoints -------------------------------------------------
        if (path === '__mock/requests') {
            return json(res, 200, received);
        }

        if (path === '__mock/reset') {
            received.length = 0;
            return json(res, 200, { ok: true });
        }

        // --- Auth -------------------------------------------------------------------
        // Login must return an `Authorization` cookie; ExternalAuthController reads it
        // off the response and stores it in the session. Without it, login fails with
        // "Missing auth cookie from external API".
        if (path === 'sessions' && req.method === 'POST') {
            let creds = {};
            try {
                creds = JSON.parse(body || '{}');
            } catch {
                creds = {};
            }

            if (creds.email !== USER.email || creds.password !== USER.password) {
                return json(res, 401, { message: 'Invalid credentials' });
            }

            return json(res, 200, { username: USER.username, email: USER.email, id: 'user-1' }, { 'Set-Cookie': authCookieHeader() });
        }

        if (path === 'ping') {
            return json(res, 200, { status: 'ok' });
        }

        // --- Partners & collections -------------------------------------------------
        if (path === 'partners' && req.method === 'GET') {
            return json(res, 200, [partner]);
        }

        if (path === `partners/${PARTNER_ID}` && req.method === 'GET') {
            return json(res, 200, partner);
        }

        if (path === `partners/${PARTNER_ID}/colls` && req.method === 'GET') {
            return json(res, 200, [collection]);
        }

        if (path === `colls/${COLLECTION_ID}` && req.method === 'GET') {
            return json(res, 200, {
                ...collection,
                storage_url: `${endpoint}paths/${PARTNER_ID}/${COLLECTION_ID}`,
            });
        }

        // --- File system ------------------------------------------------------------
        if (path === `paths/${PARTNER_ID}/${COLLECTION_ID}/subdir`) {
            return json(res, 200, buildSubdirListing(endpoint));
        }

        if (path === `paths/${PARTNER_ID}/${COLLECTION_ID}` || path === `paths/${PARTNER_ID}/${COLLECTION_ID}/wip`) {
            return json(res, 200, buildListing(endpoint));
        }

        if (path.endsWith('notes.txt') || path.endsWith('nested.txt')) {
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Content-Length': Buffer.byteLength(NOTES_TXT_CONTENT),
                'Set-Cookie': authCookieHeader(),
            });
            return res.end(NOTES_TXT_CONTENT);
        }

        if (path.endsWith('video-sample.mp4')) {
            const buf = Buffer.from('fake-mp4-bytes');
            res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': buf.length, 'Set-Cookie': authCookieHeader() });
            return res.end(buf);
        }

        // --- Workflows --------------------------------------------------------------
        if (path === 'jobs' && req.method === 'POST') {
            return json(res, 201, { id: 'job-123', status: 'queued' });
        }

        // --- Search -----------------------------------------------------------------
        if (path === 'search') {
            const term = url.searchParams.get('q') ?? url.searchParams.get('term') ?? 'test';
            const page = Number(url.searchParams.get('page') ?? '1');
            return json(res, 200, buildSearchResults(term, page));
        }

        // --- Settings ---------------------------------------------------------------
        if (path === 'users' && req.method === 'PATCH') {
            return json(res, 200, { id: 'user-1', username: USER.username });
        }

        return json(res, 404, { message: `Mock RS API: unhandled ${req.method} /${path}` });
    });

    return server;
}
