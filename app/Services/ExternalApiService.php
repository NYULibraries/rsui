<?php

namespace App\Services;

use App\Http\Resources\ExternalSearchCollection;
use Exception;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Coordinates resource-specific operations against the external RS API.
 *
 * HTTP transport, authentication-cookie refresh, session validation, and file
 * streaming are delegated to focused services. This facade remains the stable
 * application-facing API used by controllers and preserves the response-shaping
 * behavior expected by the frontend.
 */
class ExternalApiService
{
    private string $endpoint;

    private readonly ExternalApiClient $client;

    private readonly ExternalFileDownloader $downloader;

    public function __construct(?ExternalApiClient $client = null, ?ExternalFileDownloader $downloader = null)
    {
        $this->client = $client ?? new ExternalApiClient;
        $this->downloader = $downloader ?? new ExternalFileDownloader($this->client);
        $this->endpoint = $this->client->endpoint();
    }

    /**
     * Downloads a file from an external service and streams it directly to the client's browser.
     *
     * This function retrieves a file from a specified external path, authenticating
     * with an 'external_auth_cookie' stored in the session. It constructs the full URL,
     * sends a streamed GET request to the external service, and then pipes the
     * received stream directly to the browser as a download. The filename for the
     * download is derived from the provided $path.
     *
     * @param  string  $path  The relative or absolute path to the file on the external service.
     *                        If relative, it will be prefixed with the controller's endpoint.
     * @return StreamedResponse A streamed response that
     *                          sends the file content to the client.
     *
     * @throws Exception If the external authentication cookie is not found,
     *                   if the URL is invalid, or if the file download from the
     *                   external service fails.
     */
    public function downloadFile(string $path): StreamedResponse
    {
        return $this->downloader->download($path);
    }

    /**
     * Get all resources from the external API.
     *
     * @param  string  $endpoint  The API endpoint (e.g., 'products', 'users')
     * @return array|null The API response data, or null on failure.
     */
    public function getPath(string $path): ?array
    {
        $sanitizedPath = trim($path);

        if (empty($sanitizedPath)) {
            abort(404, 'Invalid file path.');
        }

        $requestPath = "{$sanitizedPath}?include=workflows";

        $response = $this->client->request('GET', $requestPath);

        if (! $response || $response->failed()) {
            abort(502, 'Unable to reach the resource service.');
        }

        $data = $response->json();

        if (! is_array($data)) {
            abort(502, 'The resource service returned an unreadable response.');
        }

        $data['url'] = "/fs/{$sanitizedPath}";

        if (isset($data['children']) && is_array($data['children'])) {
            $data['children'] = collect($data['children'])->map(function ($child) {
                if (isset($child['url'])) {
                    $child['url'] = str_replace($this->endpoint, '/fs', $child['url']);
                }

                if (isset($child['download_url'])) {
                    $downloadUrl = $child['download_url'];
                    $child['download_url'] = str_replace($this->endpoint, '/download', $downloadUrl);
                    $child['preview_url'] = str_replace($this->endpoint, '/preview', $downloadUrl);
                }

                return $child;
            })->all();
        }

        return $data;
    }

    /**
     * Ping service.
     *
     * @return array|null The API response data, or null on failure.
     */
    public function ping(): ?array
    {
        $response = $this->client->request('GET', 'ping');

        return $response?->json();
    }

    /**
     * Submit a workflow job to the external RS API.
     *
     * @param  string  $workflowId  The workflow identifier (e.g. "push_rw_flow").
     * @param  array<string, string>  $parameters  User-supplied and context-resolved parameters.
     * @return array{job_id?: string, status?: string, message?: string}|null The API response, or null on failure.
     */
    public function submitWorkflow(string $workflowId, array $parameters): ?array
    {
        try {

            $response = $this->client->request('POST', 'jobs', [
                'json' => [
                    'workflow_id' => $workflowId,
                    'parameters' => $parameters,
                ],
            ]);

            if (! $response || $response->failed()) {
                Log::error("submitWorkflow: request failed for workflow [{$workflowId}]", [
                    'status' => $response?->status(),
                    'body' => $response?->body(),
                    'parameters' => $parameters,
                ]);

                return null;
            }

            return $response->json();

        } catch (Exception $e) {
            Log::error('submitWorkflow error: '.$e->getMessage(), [
                'workflow_id' => $workflowId,
                'parameters' => $parameters,
                'exception' => $e,
            ]);

            return null;
        }
    }

    /**
     * Get all resources from the external API.
     *
     * @param  string  $endpoint  The API endpoint (e.g., 'products', 'users')
     * @return array|null The API response data, or null on failure.
     */
    public function getPartners(): ?array
    {
        $response = $this->client->request('GET', 'partners');

        return $response?->json();
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param  mixed  $id  The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getPartnerById(string $id): ?array
    {

        try {

            $response = $this->client->request('GET', "partners/{$id}");

            $data = $response?->json();

            $collection_response = $this->client->request('GET', "partners/{$id}/colls");

            $collection_data = $collection_response?->json();

            $data['collections'] = $collection_data;

            return $data;

        } catch (Exception $e) {
            Log::error('External API connection error: '.$e->getMessage(), ['exception' => $e]);

            return null;
        }
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param  mixed  $id  The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getCollectionById(string $id): ?array
    {

        try {

            $response = $this->client->request('GET', "colls/{$id}");

            $data = $response?->json();

            if (isset($data['partner_id'])) {

                $partnerId = $data['partner_id'];

                $partner = $this->client->request('GET', "partners/{$partnerId}");

                $partnerData = $partner?->json();

                if (isset($data['storage_url'])) {
                    $data['storage_url'] = str_replace($this->endpoint, '/fs/', $data['storage_url']);
                }

                $data['partner'] = $partnerData;

                return $data;

            } else {
                throw new Exception('partner_id not set');
            }

        } catch (Exception $e) {
            Log::error('getCollectionById error: '.$e->getMessage(), ['exception' => $e]);

            return null;
        }
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param  mixed  $id  The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getCollectionsByPartnerId(string $id): ?array
    {

        $response = $this->client->request('GET', "partners/{$id}/colls");

        $data = $response?->json();

        return $data;
    }

    /**
     * Update a user's name on the external API.
     *
     * @param  string  $userId  The ID of the user to update.
     * @param  string  $newName  The new name for the user.
     * @return array|null The API response data, or null on failure.
     */
    public function updateUserName(string $userId, string $newName): ?array
    {
        try {
            $response = $this->client->request('PATCH', 'users', [
                'json' => ['username' => $newName],
            ]);

            return $response?->json();
        } catch (Exception $e) {
            Log::error('Failed to update user: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return null;
        }
    }

    /**
     * Update a user's password on the external API.
     *
     * @param  array  $passwordData  The password data.
     * @return array|null The API response data, or null on failure.
     */
    public function updateUserPassword(array $passwordData): ?array
    {
        try {

            $response = $this->client->request('PATCH', 'users', [
                'json' => $passwordData,
            ]);

            return $response?->json();
        } catch (Exception $e) {
            Log::error('Failed to update user password: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return null;
        }
    }

    /**
     * Search packages using the external API.
     *
     * This method queries the external service for packages matching the search term,
     * tracks the execution time (QTime) to maintain Solr parity, and wraps the
     * results in a ResourceCollection for standardized JSON transformation.
     *
     * @param  string  $term  The search term to query against the 'packages' scope.
     * @param  array  $options  Additional query parameters (pagination, filters, etc.).
     * @return ExternalSearchCollection|null The transformed collection of results or null on failure.
     */
    public function search(string $term, array $options = []): ?ExternalSearchCollection
    {
        // 1. Start timer to calculate search performance (QTime)
        $startTime = microtime(true);

        try {
            // 2. Build query parameters including pagination
            $queryParams = [
                'scope' => 'packages',
                'term' => $term,
            ];

            // Add pagination parameters if provided
            if (isset($options['start'])) {
                $queryParams['start'] = $options['start'];
            }

            if (isset($options['rows'])) {
                $queryParams['rows'] = $options['rows'];
            }

            // 3. Execute authenticated GET request to search endpoint with all parameters
            $response = $this->client->request('GET', 'search?'.http_build_query($queryParams));

            $results = $response?->json();

            // 3. Return null if no response or empty data found
            if (empty($results)) {
                return null;
            }

            /**
             * 4. Prepare Metadata
             * We calculate qTime in milliseconds and extract pagination info
             * from the external response to pass into the Collection wrapper.
             */
            $meta = [
                'qTime' => (int) round((microtime(true) - $startTime) * 1000),
                'term' => $term,
                'start' => $results['response']['start'] ?? 0,
                'rows' => $options['rows'] ?? 10,
                'numFound' => $results['response']['numFound'] ?? 0,
            ];

            /**
             * 5. Transform and Wrap
             * We convert the 'docs' array into a Laravel Collection and pass it
             * to ExternalSearchCollection, which handles the final Solr-style nesting.
             */
            return new ExternalSearchCollection(
                collect($results['response']['docs'] ?? []),
                $meta
            );

        } catch (Exception $e) {
            // 6. Log the failure with context for debugging
            Log::error('Search error: '.$e->getMessage(), [
                'term' => $term,
                'exception' => $e,
            ]);

            return null;
        }
    }
}
