<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->endpoint = 'https://dev-rsbe.dlib.nyu.edu/api/v0';

    config(['services.rs.v1.endpoint' => $this->endpoint]);

    session([
        'external_auth_cookie' => 'test-cookie',
        'external_auth_expires' => now()->addHour()->timestamp,
    ]);
});

test('getPath aborts with a gateway error when the external service fails', function () {
    Http::fake([
        $this->endpoint.'/*' => Http::response('upstream exploded', 500),
    ]);

    $service = new ExternalApiService;

    expect(fn () => $service->getPath('paths/123'))
        ->toThrow(HttpException::class);
});

test('getPath aborts with a gateway error when the external service returns a non-array body', function () {
    Http::fake([
        $this->endpoint.'/*' => Http::response('"just a string"', 200, ['Content-Type' => 'application/json']),
    ]);

    $service = new ExternalApiService;

    expect(fn () => $service->getPath('paths/123'))
        ->toThrow(HttpException::class);
});

test('the fs route never responds with an empty body when the external service fails', function () {
    Http::fake([
        $this->endpoint.'/*' => Http::response('', 500),
    ]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->withSession([
            'external_auth_cookie' => 'test-cookie',
            'external_auth_expires' => now()->addHour()->timestamp,
        ])
        ->getJson('/fs/paths/123');

    // Regression guard: an empty 200 body caused the browser to fail with
    // "JSON.parse: unexpected end of data at line 1 column 1".
    $response->assertStatus(502);
    expect($response->getContent())->not->toBe('');
    expect($response->json())->toBeArray();
});
