<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    public function __invoke(string $path, Request $request): StreamedResponse
    {
        // Forward the client's Range header so <audio>/<video> playback can seek
        // without re-downloading the whole file from the start.
        return $this->externalApiService->downloadFile($path, $request->header('Range'));
    }
}
