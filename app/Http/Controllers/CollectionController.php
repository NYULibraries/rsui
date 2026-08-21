<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Exception;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CollectionController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    public function show(string $id): Response
    {
        try {
            $collection = $this->externalApiService->getCollectionById($id);

            if (! $collection) {
                throw new Exception('Collection not found');
            }

            $partnerId = $collection['partner_id'] ?? throw new Exception('Collection missing partner_id');
            $collectionId = $collection['id'] ?? throw new Exception('Collection missing id');

            return Inertia::render('collection/Index', [
                'collection' => $collection,
                'storage_path' => $this->buildStoragePath($collection, $partnerId, $collectionId),
            ]);
        } catch (Exception $exception) {
            return $this->renderCollectionError($exception, $id);
        }
    }

    public function path(string $partnerId, string $collectionId, string $storage_path = ''): Response
    {
        try {
            $collection = $this->externalApiService->getCollectionById($collectionId);

            if (! $collection) {
                throw new Exception('Collection not found');
            }

            return Inertia::render('collection/Index', [
                'collection' => $collection,
                'storage_path' => $this->buildStoragePath($collection, $partnerId, $collectionId, $storage_path),
            ]);
        } catch (Exception $exception) {
            return $this->renderCollectionError($exception, $collectionId);
        }
    }

    /**
     * @param  array<string, mixed>  $collection
     * @return array<int, array{name: string, object_type: string, display_size: string, url: string}>
     */
    private function buildStoragePath(array $collection, string $partnerId, string $collectionId, string $storagePath = ''): array
    {
        $code = $collection['code'] ?? throw new Exception('Collection missing code');
        $storage = [$code];

        if ($storagePath !== '') {
            $storage = array_unique(array_merge($storage, explode('/', $storagePath)));
        }

        $baseUrl = "/fs/paths/{$partnerId}/{$collectionId}";
        $currentUrl = $baseUrl;
        $transformed = [];

        foreach ($storage as $index => $name) {
            $itemUrl = $index === 0 ? $baseUrl : "{$currentUrl}/{$name}";
            $transformed[] = [
                'name' => $name,
                'object_type' => 'directory',
                'display_size' => '',
                'url' => $itemUrl,
            ];
            $currentUrl = $itemUrl;
        }

        return $transformed;
    }

    private function renderCollectionError(Exception $exception, string $collectionId): Response
    {
        Log::error('External API error while loading collection.', [
            'collection_id' => $collectionId,
            'exception' => $exception->getMessage(),
        ]);

        return Inertia::render('collection/Index', [
            'collection' => null,
            'storage_path' => [],
            'error' => 'External API error: '.$exception->getMessage(),
        ]);
    }
}
