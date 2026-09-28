<?php

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Regression tests ensuring the client's Range header (used by <audio>/<video>
 * to seek without re-downloading the whole file) reaches ExternalApiService.
 */
uses(RefreshDatabase::class);

test('the Range request header is forwarded to the download service', function () {
    $this->mock(ExternalApiService::class, function ($mock) {
        $mock->shouldReceive('downloadFile')
            ->once()
            ->with('paths/123/video.mp4', 'bytes=0-1023')
            ->andReturn(new StreamedResponse(fn () => null, 206));
    });

    $this->actingAs(User::factory()->create())
        ->withSession(['external_auth_expires' => now()->addHour()->timestamp])
        ->withHeaders(['Range' => 'bytes=0-1023'])
        ->get('/download/paths/123/video.mp4')
        ->assertStatus(206);
});

test('a null range is forwarded when the client does not request one', function () {
    $this->mock(ExternalApiService::class, function ($mock) {
        $mock->shouldReceive('downloadFile')
            ->once()
            ->with('paths/123/video.mp4', null)
            ->andReturn(new StreamedResponse(fn () => null, 200));
    });

    $this->actingAs(User::factory()->create())
        ->withSession(['external_auth_expires' => now()->addHour()->timestamp])
        ->get('/download/paths/123/video.mp4')
        ->assertOk();
});
