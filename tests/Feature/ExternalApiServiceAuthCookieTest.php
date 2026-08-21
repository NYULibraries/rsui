<?php

use App\Services\ExternalApiService;
use Illuminate\Support\Facades\Http;

/**
 * Regression tests for the auth cookie refresh performed after every upstream call.
 *
 * The response cookie jar contains BOTH the cookie sent with the request (no expiry)
 * and the fresh cookie returned by the upstream. Reading the wrong one wiped
 * `external_auth_expires`, and CheckExternalAuthExpiration then logged the user out.
 */
beforeEach(function () {
    $this->endpoint = 'https://dev-rsbe.dlib.nyu.edu/api/v0';
    config(['services.rs.v1.endpoint' => $this->endpoint]);
});

test('a known expiry survives a response whose first Authorization cookie has none', function () {
    $originalExpiry = now()->addHour()->timestamp;
    $refreshedExpiry = now()->addHours(2)->timestamp;

    session([
        'external_auth_cookie' => 'old-cookie',
        'external_auth_expires' => $originalExpiry,
    ]);

    Http::fakeSequence()->push(
        body: ['object_type' => 'directory', 'children' => []],
        headers: [
            'Set-Cookie' => 'Authorization=refreshed-cookie; Path=/; Expires='
                .gmdate('D, d M Y H:i:s \G\M\T', $refreshedExpiry),
        ],
    );

    (new ExternalApiService)->getPath('paths/123');

    expect(session('external_auth_cookie'))->toBe('refreshed-cookie');
    expect(session('external_auth_expires'))->not->toBeNull();
    expect((int) session('external_auth_expires'))->toBeGreaterThanOrEqual($originalExpiry);
});

test('a response carrying no Set-Cookie leaves the stored credentials untouched', function () {
    $expiry = now()->addHour()->timestamp;

    session([
        'external_auth_cookie' => 'existing-cookie',
        'external_auth_expires' => $expiry,
    ]);

    Http::fake([
        $this->endpoint.'/*' => Http::response(['object_type' => 'directory', 'children' => []], 200),
    ]);

    (new ExternalApiService)->getPath('paths/123');

    expect(session('external_auth_cookie'))->toBe('existing-cookie');
    expect(session('external_auth_expires'))->toBe($expiry);
});
