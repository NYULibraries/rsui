<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    public function __invoke(string $path): StreamedResponse
    {
        return $this->externalApiService->downloadFile($path);
    }
}
