<?php

use App\Services\ExternalApiService;
use Illuminate\Support\Facades\Http;

test('getPath rewrites child download and preview urls without double slashes', function () {
    $endpoint = 'https://dev-rsbe.dlib.nyu.edu/api/v0';
    config(['services.rs.v1.endpoint' => $endpoint]);

    session([
        'external_auth_cookie' => 'test-cookie',
        'external_auth_expires' => now()->addHour()->timestamp,
    ]);

    Http::fake([
        $endpoint.'/*' => Http::response([
            'name' => 'somedir',
            'object_type' => 'directory',
            'children' => [
                [
                    'name' => 'bigfile.dat',
                    'object_type' => 'file',
                    'url' => $endpoint.'/paths/123/bigfile.dat',
                    'download_url' => $endpoint.'/paths/123/bigfile.dat',
                ],
            ],
        ], 200),
    ]);

    $service = new ExternalApiService;
    $data = $service->getPath('paths/123');

    expect($data)->not->toBeNull();

    $child = $data['children'][0];

    expect($child['url'])->toBe('/fs/paths/123/bigfile.dat');
    expect($child['download_url'])->toBe('/download/paths/123/bigfile.dat');
    expect($child['preview_url'])->toBe('/preview/paths/123/bigfile.dat');

    // Regression guard for the "/download//paths/..." double-slash bug.
    expect($child['download_url'])->not->toContain('//');
    expect($child['preview_url'])->not->toContain('//');
    expect($child['url'])->not->toContain('//');
});

test('getPath does not leak the include=workflows query string into the item url', function () {
    $endpoint = 'https://dev-rsbe.dlib.nyu.edu/api/v0';
    config(['services.rs.v1.endpoint' => $endpoint]);

    session([
        'external_auth_cookie' => 'test-cookie',
        'external_auth_expires' => now()->addHour()->timestamp,
    ]);

    Http::fake([
        $endpoint.'/*' => Http::response([
            'name' => 'somedir',
            'object_type' => 'directory',
        ], 200),
    ]);

    $service = new ExternalApiService;
    $data = $service->getPath('paths/123');

    expect($data['url'])->toBe('/fs/paths/123');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'include=workflows');
    });
});
