<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * Class ExternalSearchCollection
 *
 * This collection resource is responsible for wrapping a set of search results
 * with metadata required to mimic a Solr search response. It bridges the gap
 * between the raw external API output and the format expected by the frontend.
 */
class ExternalSearchCollection extends ResourceCollection
{
    /**
     * Store metadata (timing, term, counts) passed from the service.
     */
    protected array $meta;

    /**
     * Create a new resource collection instance.
     *
     * @param  mixed  $resource  The collection of package documents.
     * @param  array  $meta      Execution metadata (qTime, term, numFound, etc.)
     */
    public function __construct($resource, array $meta)
    {
        parent::__construct($resource);
        $this->meta = $meta;
    }

    /**
     * Transform the resource collection into an array.
     * * This method structures the response into two main blocks:
     * 1. responseHeader: Contains the performance data and original query parameters.
     * 2. response: Contains the total hit count and the actual transformed documents.
     */
    public function toArray(Request $request): array
    {
        return [
            /**
             * Mimics the Solr responseHeader.
             * QTime represents the internal execution time in milliseconds.
             */
            'responseHeader' => [
                'status' => 0,
                'QTime'  => $this->meta['qTime'] ?? 0,
                'params' => [
                    'term'  => $this->meta['term'] ?? '',
                    'start' => $this->meta['start'] ?? 0,
                    'rows'  => $this->meta['rows'] ?? 10,
                ],
            ],

            /**
             * The actual search payload.
             * 'docs' automatically uses ExternalSearchResource for each item
             * in the collection to ensure individual URLs are cleaned.
             */
            'response' => [
                'numFound' => (int) ($this->meta['numFound'] ?? 0),
                'start'    => (int) ($this->meta['start'] ?? 0),
                'docs'     => $this->collection,
            ],
        ];
    }
}
