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
         */
        $data = $this->resource['package_search_response'] ?? [];

        // Also capture 'match_context' if it's at the root of the item rather than in the response wrapper
        $matchContext = $data['match_context'] ?? ($this->resource['match_context'] ?? '');

        /**
         * 2. URL Normalization
         */
        $endpoint = config('services.rs.v1.endpoint');

        if (isset($data['package_path_url'])) {
            $data['package_path_url'] = str_replace($endpoint, '/', $data['package_path_url']);
        } else {
            $data['package_path_url'] = null;
        }

        if (isset($data['match_path_url'])) {
            $data['match_path_url'] = str_replace($endpoint, '/', $data['match_path_url']);
        } else {
            $data['match_path_url'] = null;
        }

        /**
         * 3. Manual Highlighting
         * We grab the 'term' from the request. If it exists, we wrap matches
         * in <em> tags within the match_context string.
         */
        $searchTerm = $request->query('term');

        if (!empty($searchTerm) && !empty($matchContext)) {
            // preg_quote escapes special characters in the search term
            // The 'i' flag makes it case-insensitive
            $quotedTerm = preg_quote($searchTerm, '/');
            $data['match_context'] = preg_replace(
                "/($quotedTerm)/i",
                '<em class="bg-yellow-100 text-black font-semibold not-italic">$1</em>',
                $matchContext
            );
        } else {
            $data['match_context'] = $matchContext;
        }

        /**
         * 4. Return Cleaned Data
         */
        return $data;
    }
}
