<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->externalApiService->ping());
    }
}
