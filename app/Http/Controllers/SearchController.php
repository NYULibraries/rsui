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
        $term = trim((string) $request->get('term', ''));

        $page = max(1, (int) $request->get('page', 1));

        $rows = 10;

        $docs = [];

        $numFound = 0;

        $start = 0;

        $totalPages = 1;

        $error = null;

        if ($term !== '') {
            try {
                $start = ($page - 1) * $rows;

                // 1. Get the Resource Collection
                $resource = $this->externalApiService->search($term, [
                    'rows' => $rows,
                    'start' => $start,
                ]);

                if ($resource) {
                    /**
                     * 2. Extract data from the Resource.
                     * Since we documented our Collection to have 'response' and 'responseHeader',
                     * we turn the resource into an array to read those keys.
                     */
                    $data = $resource->toArray($request);

                    $numFound = $data['response']['numFound'] ?? 0;

                    // 'docs' contains the transformed ExternalSearchResource items
                    $docs = $data['response']['docs'] ?? [];

                    $totalPages = max(1, (int) ceil($numFound / $rows));
                }

            } catch (\Throwable $e) {
                $error = 'Search error: ' . $e->getMessage();
                Log::error($error);
            }
        }

        return Inertia::render('search/Index', [
            'term' => $term,
            'results' => $docs,
            'numFound' => $numFound,
            'start' => $start,
            'page' => $page,
            'totalPages' => $totalPages,
            'error' => $error,
        ]);
    }

    public function apisearch(Request $request): JsonResponse
    {

        $term = $request->get('term', '');

        $rows = $request->get('rows', 10);

        $start = $request->get('start', 0);

        if (empty($term) || strlen($term) < 1) {
            return response()->json([]); // must return error
        }

        try {

            return response()->json(
                $this->externalApiService->search($term, [ 'rows' => $rows, 'start' => $start, ]) ?? []
            );

        } catch (Exception $e) {
            Log::error("Autocomplete error: " . $e->getMessage());
            return response()->json([]);
        }
    }

    public function autocomplete(Request $request): JsonResponse
    {

        $term = $request->get('term', '');

        $error = null;

        $numFound = 0;

        $start = 0;


        if (empty($term) || strlen($term) < 2) {
            return response()->json([]);
        }

        try {
            $results = $this->externalApiService->search($term) ?? [];

            if (!empty($results)) {
                $numFound = $results['response']['numFound'];
                $start = $results['response']['start'];
                foreach ($results['response']['docs'] as $document) {
                  $documents[] = $document['package_search_response'];
                }
            }

            return response()->json([
                'term' => $term,
                'results' => $documents,
                'numFound' => $numFound,
                'start' => $start,
                'error' => $error,
            ]);

        } catch (Exception $e) {
            Log::error("Autocomplete error: " . $e->getMessage());
            return response()->json([]);
        }

    }
}
