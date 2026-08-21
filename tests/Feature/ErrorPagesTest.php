<?php

use Illuminate\Support\Facades\Route;

test('missing pages use the branded Inertia error page', function () {
    $response = $this->withHeaders([
        'Accept' => 'text/html, application/xhtml+xml',
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
    ])->get('/does-not-exist');

    $response->assertNotFound()
        ->assertJsonPath('component', 'errors/Error')
        ->assertJsonPath('props.status', 404);
});

test('upstream failures use the file service error page', function () {
    Route::get('/testing/bad-gateway', fn () => abort(502));

    $response = $this->withHeaders([
        'Accept' => 'text/html, application/xhtml+xml',
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
    ])->get('/testing/bad-gateway');

    $response->assertStatus(502)
        ->assertJsonPath('component', 'errors/Error')
        ->assertJsonPath('props.status', 502);
});

test('all supported error statuses use the custom page', function () {
    foreach ([403, 419, 500, 503] as $status) {
        Route::get("/testing/error-{$status}", fn () => abort($status));

        $response = $this->withHeaders([
            'Accept' => 'text/html, application/xhtml+xml',
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->get("/testing/error-{$status}");

        $response->assertStatus($status)
            ->assertJsonPath('component', 'errors/Error')
            ->assertJsonPath('props.status', $status);
    }
});

test('JSON clients retain the standard error response', function () {
    $response = $this->getJson('/does-not-exist');

    $response->assertNotFound()
        ->assertJsonMissingPath('component');
});
