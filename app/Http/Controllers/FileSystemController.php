<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Illuminate\Http\JsonResponse;

class FileSystemController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    public function __invoke(string $path): JsonResponse
    {
        return response()->json($this->externalApiService->getPath($path));
    }
}
