<?php

namespace App\Services;

use App\Exceptions\ExternalAuthSessionExpiredException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Http\Resources\ExternalSearchCollection;

use Exception;

class ExternalApiService
{
    protected $endpoint;

    public function __construct()
    {
        $this->endpoint = rtrim(config('services.rs.v1.endpoint'), '/');
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
    * @param string $path The relative or absolute path to the file on the external service.
    * If relative, it will be prefixed with the controller's endpoint.
    * @return \Symfony\Component\HttpFoundation\StreamedResponse A streamed response that
    * sends the file content to the client.
    * @throws \Exception If the external authentication cookie is not found,
    * if the URL is invalid, or if the file download from the
    * external service fails.
    */
    public function downloadFile(string $path): StreamedResponse
    {

        try {

            $this->validateSession();

            $cookie = session('external_auth_cookie');

            if (!$cookie) {
                throw new \Exception("External authentication cookie not found in session.");
            }

            if (!str_starts_with($path, 'http://') && !str_starts_with($path, 'https://')) {
                $path = rtrim($this->endpoint, '/') . '/' . ltrim($path, '/');
            }

            $domain = parse_url($path, PHP_URL_HOST);
            if (!$domain) {
                throw new \Exception("Invalid URL: no host detected.");
            }

            $externalRequestUrl = "{$path}?download=true";

            Log::info("External request Url: $externalRequestUrl}");

            $filename = basename(parse_url($path, PHP_URL_PATH));
            if (empty($filename) || $filename === '/') {
                $filename = 'downloaded_file'; // Fallback if no filename can be extracted
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $externalRequestUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
            curl_setopt($ch, CURLOPT_HEADER, false);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3600);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

            $requestHeaders = [
                'Accept-Encoding: gzip, deflate, br',
                'Connection: keep-alive',
                'User-Agent: RSUI/1.0 (dlts@nyu.edu)',
                'Accept: */*',
                "Cookie: Authorization={$cookie}",
            ];

            curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);

            $responseHeaders = [];

            curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
                $len = strlen($header);
                $parts = explode(':', $header, 2);
                if (count($parts) < 2) {
                    return $len;
                }
                $responseHeaders[strtolower(trim($parts[0]))][] = trim($parts[1]);
                return $len;
            });

            // LOG::info($responseHeaders);

            // Pass the derived filename to the StreamedResponse
            return new StreamedResponse(function () use ($ch) {
                curl_exec($ch);
                if (curl_errno($ch)) {
                    Log::error("cURL error during streaming: " . curl_error($ch));
                }
                curl_close($ch);
            }, 200, [
                'Content-Type' => $responseHeaders['content-type'][0] ?? 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Content-Length' => $responseHeaders['content-length'][0] ?? null,
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);

        } catch (\Exception $e) {
            Log::error("File download error: " . $e->getMessage(), ['exception' => $e]);
            return new StreamedResponse(function () use ($e) {
                echo "Error downloading file: " . $e->getMessage();
            }, 500, [
                'Content-Type' => 'text/plain',
            ]);
        }
    }

    /**
     * Get all resources from the external API.
     *
     * @param string $endpoint The API endpoint (e.g., 'products', 'users')
     * @return array|null The API response data, or null on failure.
     */
    public function getPath(string $path): ?array
    {

        $pathSegments = explode('/', $path);

        $cleanedSegments = [];

        foreach ($pathSegments as $segment) {
            $cleanedSegments[] = preg_replace('/[^a-zA-Z0-9\._-]/', '', $segment);
        }

        $sanitizedPath = implode('/', array_filter($cleanedSegments));

        // After sanitation, you might want to ensure it's not empty
        if (empty($sanitizedPath)) {
            abort(404, 'Invalid file path.');
        }

        $response = $this->makeRequest('GET', $sanitizedPath);

        $data = $response->json();

        $data['url'] = "/fs/{$sanitizedPath}";
        if (isset($data['children'])) {
          foreach ($data['children'] as $index => $child) {
            if (isset($data['children'][$index]['url'])) {
              $data['children'][$index]['url'] = str_replace($this->endpoint, '/fs/', $data['children'][$index]['url']);
            }
            if (isset($data['children'][$index]['download_url'])) {
              $download_url = $data['children'][$index]['download_url'];
              $data['children'][$index]['download_url'] = str_replace($this->endpoint, '/download/', $download_url);
              $data['children'][$index]['preview_url'] = str_replace($this->endpoint, '/preview/', $download_url);
            }
          }
        }

        return $data;
    }

    /**
     * Ping service.
     *
     * @param string $endpoint The API endpoint (e.g., 'products', 'users')
     * @return array|null The API response data, or null on failure.
     */
    public function ping(): ?array
    {
        $response = $this->makeRequest('GET', 'ping');

        return $response?->json();
    }

    /**
     * Get all resources from the external API.
     *
     * @param string $endpoint The API endpoint (e.g., 'products', 'users')
     * @return array|null The API response data, or null on failure.
     */
    public function getPartners(): ?array
    {
        $response = $this->makeRequest('GET', 'partners');

        return $response?->json();
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param mixed $id The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getPartnerById(string $id): ?array
    {

        try {

            $response = $this->makeRequest('GET', "partners/{$id}");

            $data = $response?->json();

            $collection_response = $this->makeRequest('GET', "partners/{$id}/colls");

            $collection_data = $collection_response?->json();

            $data['collections'] = $collection_data;

            return $data;

        } catch (Exception $e) {
            Log::error("External API connection error: " . $e->getMessage(), [ 'exception' => $e, ]);
            return null;
        }
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param mixed $id The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getCollectionById(string $id): ?array
    {

        try {

            $response = $this->makeRequest('GET', "colls/{$id}");

            $data = $response?->json();

            if (isset($data['partner_id'])) {

                $partnerId = $data['partner_id'];

                $partner = $this->makeRequest('GET', "partners/{$partnerId}");

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
            Log::error("getCollectionById error: " . $e->getMessage(), [ 'exception' => $e, ]);
            return null;
        }
    }

    /**
     * Get a single resource by ID from the external API.
     *
     * @param mixed $id The ID of the resource.
     * @return array|null The API response data, or null on failure.
     */
    public function getCollectionsByPartnerId(string $id): ?array
    {

       $response = $this->makeRequest('GET', "partners/{$id}/colls");

       $data = $response?->json();

       return $data;
    }

    /**
     * Make an authenticated HTTP request to the external API.
     *
     * @param string $method The HTTP method (GET, POST, PUT, DELETE).
     * @param string $path The API path relative to the base URL.
     * @param array $options Additional Guzzle request options.
     * @return \Illuminate\Http\Client\Response|null The Laravel HTTP client response, or null on error.
     */
    protected function makeRequest(string $method, string $path, array $options = [], bool $useCache = true, int $cacheMinutes = 10): ?Response
    {
        try {

            $this->validateSession();

            // Generate a cache key that is unique to the user and the request
            // We'll use the session ID to tie the cache to the user's session.
            // Also include method, path, and a hash of options to ensure unique requests have unique cache keys.
            $sessionId = session()->getId();

            $cacheKey = "external_api:user_{$sessionId}:{$method}:{$path}:" . md5(json_encode($options));

            // if ($useCache && Cache::has($cacheKey)) {
            //     // Return cached response if it exists and caching is enabled
            //     return Cache::get($cacheKey);
            // }

            $cookie = session('external_auth_cookie');

            if (!$cookie) {
                // Throw an exception indicating an authentication issue
                // @TODO: Create a custom exception like AuthenticationException
                throw new Exception("External authentication cookie not found in session.");
            }

            $domain = parse_url($this->endpoint, PHP_URL_HOST);

            Log::info("makeRequest Url: {$this->endpoint}{$path}");

            $response = Http::baseUrl($this->endpoint)
                ->withCookies([
                    'Authorization' => $cookie,
                ], $domain)
                ->withHeaders([
                    'User-Agent' => 'RSUI/1.0 (dlts@nyu.edu)',
                    'Accept' => 'application/json',
                ])
                ->send($method, $path, $options);

            if ($response->failed()) {

                Log::error("External API request failed for {$path}", [
                    'url' => "{$this->endpoint}{$path}",
                    'status' => $response->status()
                ]);


                throw new Exception("External API request failed for {$path}");

            }

            $this->updateAuthCookieFromResponse($response);

            if ($useCache) {
                // Cache the response if caching is enabled
                Cache::put($cacheKey, $response, now()->addMinutes($cacheMinutes));
            }

            return $response;

        } catch (Exception $e) {
            Log::error("External API connection error: " . $e->getMessage(), [
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Update the authentication cookie from the response.
     *
     * @param \Illuminate\Http\Client\Response $response
     * @return void
     */
    private function updateAuthCookieFromResponse(Response $response): void
    {
        $authCookie = optional(
            collect($response->cookies()->toArray())->firstWhere('Name', 'Authorization')
        )['Value'] ?? null;

        if ($authCookie) {
            session(['external_auth_cookie' => $authCookie]);

            $expiresCookie = optional(
                collect($response->cookies()->toArray())->firstWhere('Name', 'Authorization')
            )['Expires'] ?? null;

            session(['external_auth_expires' => $expiresCookie]);
        }
    }

    /**
     * Validate the external authentication session.
     *
     * @return void
     * @throws ExternalAuthSessionExpiredException
     */
    private function validateSession(): void
    {
        $expires = session('external_auth_expires');

        if (!$expires || now()->timestamp > $expires) {
            throw new ExternalAuthSessionExpiredException('External session has expired.');
        }
    }

    /**
     * Update a user's name on the external API.
     *
     * @param string $userId The ID of the user to update.
     * @param string $newName The new name for the user.
     * @return array|null The API response data, or null on failure.
     */
    public function updateUserName(string $userId, string $newName): ?array
    {
        try {
            $response = $this->makeRequest('PATCH', 'users', [
                'json' => ['username' => $newName],
            ], false);

            return $response?->json();
        } catch (Exception $e) {
            Log::error("Failed to update user: " . $e->getMessage(), [
                'exception' => $e,
            ]);
            return null;
        }
    }

    /**
     * Update a user's password on the external API.
     *
     * @param array $passwordData The password data.
     * @return array|null The API response data, or null on failure.
     */
    public function updateUserPassword(array $passwordData): ?array
    {
        try {

            $response = $this->makeRequest('PATCH', 'users', [
                'json' => $passwordData,
            ], false);

            return $response?->json();
        } catch (Exception $e) {
            Log::error("Failed to update user password: " . $e->getMessage(), [
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
     * @param string $term    The search term to query against the 'packages' scope.
     * @param array  $options Additional query parameters (pagination, filters, etc.).
     * @return ExternalSearchCollection|null The transformed collection of results or null on failure.
     */
    public function search(string $term, array $options = []): ?ExternalSearchCollection
    {
        // 1. Start timer to calculate search performance (QTime)
        $startTime = microtime(true);

        try {
            // 2. Execute the authenticated GET request to the search endpoint
            $response = $this->makeRequest('GET', "search?scope=packages&term=" . urlencode($term));

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
                'qTime'    => (int) round((microtime(true) - $startTime) * 1000),
                'term'     => $term,
                'start'    => $results['response']['start'] ?? 0,
                'rows'     => $options['rows'] ?? 10,
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
            Log::error("Search error: " . $e->getMessage(), [
                'term' => $term,
                'exception' => $e
            ]);
            return null;
        }
    }

}
