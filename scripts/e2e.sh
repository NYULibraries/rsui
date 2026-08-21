#!/usr/bin/env bash
#
# Runs the end-to-end suite against a hermetic stack:
#
#   * a mock RS API (tests/e2e/mock-api) standing in for RSBE
#   * a dedicated Laravel server booted with APP_ENV=e2e, so it reads .env.e2e
#
# The developer's .env is never modified, and the real upstream is never contacted.
#
# Usage: ddev exec scripts/e2e.sh [<playwright args>]

set -euo pipefail

cd "$(dirname "$0")/.."

APP_PORT="${E2E_APP_PORT:-8088}"
MOCK_PORT="${E2E_MOCK_PORT:-9911}"
APP_URL="http://127.0.0.1:${APP_PORT}"
MOCK_URL="http://127.0.0.1:${MOCK_PORT}"

MOCK_PID=""
SERVE_PID=""
HOT_MOVED=0

cleanup() {
    [ -n "$SERVE_PID" ] && kill "$SERVE_PID" 2>/dev/null || true
    [ -n "$MOCK_PID" ] && kill "$MOCK_PID" 2>/dev/null || true
    # Restore the Vite dev-server marker if we moved it aside.
    if [ "$HOT_MOVED" = "1" ] && [ -f public/hot.e2e-bak ]; then
        mv public/hot.e2e-bak public/hot
    fi
}
trap cleanup EXIT

echo "==> Building frontend assets"
# E2E must run against built assets. If public/hot exists, Laravel emits script tags
# pointing at the Vite dev server, which the test browser cannot reach -> blank page.
npm run build >/dev/null
if [ -f public/hot ]; then
    mv public/hot public/hot.e2e-bak
    HOT_MOVED=1
fi

echo "==> Writing .env.e2e"
cp .env .env.e2e
# SESSION_DOMAIN must be null: a domain-scoped cookie is rejected by a browser on
# 127.0.0.1, which silently destroys the session and every CSRF-protected POST.
# The key can appear more than once in .env, so replace all occurrences.
sed -i.bak \
    -e "s|^APP_ENV=.*|APP_ENV=e2e|" \
    -e "s|^APP_URL=.*|APP_URL=${APP_URL}|" \
    -e "s|^RS_V1_ENDPOINT=.*|RS_V1_ENDPOINT=\"${MOCK_URL}/\"|" \
    -e "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=null|g" \
    .env.e2e
rm -f .env.e2e.bak
grep -q "^RS_V1_ENDPOINT=" .env.e2e || echo "RS_V1_ENDPOINT=\"${MOCK_URL}/\"" >> .env.e2e

echo "==> Starting mock RS API on ${MOCK_URL}"
MOCK_API_PORT="$MOCK_PORT" MOCK_API_ENDPOINT="${MOCK_URL}/" \
    node tests/e2e/mock-api/start.mjs > /tmp/e2e-mock.log 2>&1 &
MOCK_PID=$!

echo "==> Starting application on ${APP_URL}"
APP_ENV=e2e php artisan serve --host=0.0.0.0 --port="$APP_PORT" > /tmp/e2e-serve.log 2>&1 &
SERVE_PID=$!

echo "==> Waiting for services"
for _ in $(seq 1 30); do
    if curl -sf "${MOCK_URL}/ping" >/dev/null && curl -sf -o /dev/null "${APP_URL}/login"; then
        break
    fi
    sleep 1
done

curl -sf "${MOCK_URL}/ping" >/dev/null || { echo "Mock API failed to start"; cat /tmp/e2e-mock.log; exit 1; }
curl -sf -o /dev/null "${APP_URL}/login" || { echo "App failed to start"; cat /tmp/e2e-serve.log; exit 1; }

echo "==> Running Playwright"
E2E_BASE_URL="$APP_URL" E2E_MOCK_API_PUBLIC="$MOCK_URL" npx playwright test "$@"
