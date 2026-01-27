<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Class ExternalSearchResource
 *
 * This resource acts as a Data Transformer (or "Translator") for a single package
 * record returned by the external API. Its primary responsibility is to extract
 * nested package data and normalize external URLs to local application paths.
 */
class ExternalSearchResource extends JsonResource
{
    /**
     * Transform the raw external API response into a standardized array.
     *
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /**
         * 1. Extract Nested Data
         * The external API wraps the relevant package details inside a
         * 'package_search_response' key. We extract this to simplify the
         * final object structure.
         */
        $data = $this->resource['package_search_response'] ?? [];

        /**
         * 2. URL Normalization
         * We retrieve the base endpoint from configuration. Any occurrence
         * of this endpoint in the 'package_path_url' is replaced with a
         * leading slash to make the path relative to our local file system routes.
         */
        $endpoint = config('services.rs.v1.endpoint');

        if (isset($data['package_path_url'])) {
            $data['package_path_url'] = str_replace($endpoint, '/', $data['package_path_url']);
        } else {
            $data['package_path_url'] = null;
        }

        /**
         * 3. Return Cleaned Data
         * Returns the flattened and URL-sanitized package attributes.
         */
        return $data;
    }
}
