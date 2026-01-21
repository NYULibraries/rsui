<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    protected $externalApiService;

    public function __construct(ExternalApiService $externalApiService)
    {
        $this->externalApiService = $externalApiService;
    }

    public function index(Request $request): Response
    {
        $term = $request->get('term', '');
        $results = [];
        $error = null;

        if (!empty($term)) {
            try {
                $results = $this->externalApiService->search($term) ?? [];
            } catch (Exception $e) {
                $error = "Search error: " . $e->getMessage();
                Log::error($error);
                $results = [];
            }
        }

        return Inertia::render('search/Index', [
            'term' => $term,
            'results' => $results,
            'error' => $error,
        ]);
    }

    public function autocomplete(Request $request): JsonResponse
    {
        $term = $request->get('term', '');
        
        if (empty($term) || strlen($term) < 2) {
            return response()->json([]);
        }

        try {
            $results = $this->externalApiService->search($term) ?? [];
            return response()->json($results);
        } catch (Exception $e) {
            Log::error("Autocomplete error: " . $e->getMessage());
            return response()->json([]);
        }
    }
}