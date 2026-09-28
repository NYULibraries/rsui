<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalFileDownloader
{
    public function __construct(private readonly ExternalApiClient $client) {}

    public function download(string $path, ?string $range = null): StreamedResponse
    {
        try {
            $this->client->validateSession();
            $cookie = session('external_auth_cookie');

            if (! $cookie) {
                throw new Exception('External authentication cookie not found in session.');
            }

            $path = $this->absolutePath($path);
            $domain = parse_url($path, PHP_URL_HOST);

            if (! $domain) {
                throw new Exception('Invalid URL: no host detected.');
            }

            $externalRequestUrl = "{$path}?download=true";

            if (App::isLocal()) {
                Log::info("External request Url: {$externalRequestUrl}");
            }

            $filename = basename(parse_url($path, PHP_URL_PATH)) ?: 'downloaded_file';
            $requestHeaders = [
                'Accept-Encoding: gzip, deflate, br',
                'Connection: keep-alive',
                'User-Agent: RSUI/'.config('app.version').' (dlts@nyu.edu)',
                'Accept: */*',
                "Cookie: Authorization={$cookie}",
            ];

            // Forwarding Range lets the origin respond with 206 Partial Content so
            // <audio>/<video> elements can seek and start playback on a slice of the
            // file instead of always re-fetching (and buffering) it from byte 0.
            if ($range) {
                $requestHeaders[] = "Range: {$range}";
            }

            $handle = curl_init();
            curl_setopt($handle, CURLOPT_URL, $externalRequestUrl);
            curl_setopt($handle, CURLOPT_RETURNTRANSFER, false);
            curl_setopt($handle, CURLOPT_HEADER, false);
            curl_setopt($handle, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($handle, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($handle, CURLOPT_TIMEOUT, 3600);
            curl_setopt($handle, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($handle, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($handle, CURLOPT_HTTPHEADER, $requestHeaders);

            // Track the response line/headers from the origin so we can mirror the
            // status code (200 vs 206) and range metadata back to the browser. These
            // are applied via raw header()/http_response_code() calls (not the
            // StreamedResponse constructor args below, which are evaluated immediately
            // and before curl ever runs) since PHP still allows overriding headers
            // as long as no response body has been flushed yet.
            curl_setopt($handle, CURLOPT_HEADERFUNCTION, function ($curl, $header): int {
                $length = strlen($header);
                $trimmed = trim($header);

                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $trimmed, $matches)) {
                    if (! headers_sent()) {
                        http_response_code((int) $matches[1]);
                    }

                    return $length;
                }

                $parts = explode(':', $header, 2);

                if (count($parts) < 2) {
                    return $length;
                }

                $name = strtolower(trim($parts[0]));
                $value = trim($parts[1]);

                if (headers_sent() || $value === '') {
                    return $length;
                }

                if ($name === 'content-type' && (str_starts_with($value, 'audio/') || str_starts_with($value, 'video/'))) {
                    // Play media inline instead of forcing a "Save As" prompt.
                    header('Content-Disposition: inline');
                }

                $forwardable = ['content-type', 'content-length', 'content-range', 'accept-ranges'];

                if (in_array($name, $forwardable, true)) {
                    header("{$name}: {$value}");
                }

                return $length;
            });

            return new StreamedResponse(function () use ($handle): void {
                // Flush each chunk to the client as soon as it arrives from the origin
                // instead of letting PHP/the webserver buffer the whole file, so
                // playback can start sooner.
                curl_setopt($handle, CURLOPT_WRITEFUNCTION, function ($curl, $chunk): int {
                    echo $chunk;
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();

                    return strlen($chunk);
                });

                curl_exec($handle);

                if (curl_errno($handle)) {
                    Log::error('cURL error during streaming: '.curl_error($handle));
                }

                curl_close($handle);
            }, 200, [
                'Content-Type' => 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                // Range responses are safe to cache privately (per-user, per-session) so
                // repeated seeks/replays don't have to re-hit the origin every time.
                'Cache-Control' => 'private, max-age=3600',
            ]);
        } catch (Exception $exception) {
            Log::error('File download error: '.$exception->getMessage(), ['exception' => $exception]);

            return new StreamedResponse(function () use ($exception): void {
                echo 'Error downloading file: '.$exception->getMessage();
            }, 500, ['Content-Type' => 'text/plain']);
        }
    }

    private function absolutePath(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return $this->client->endpoint().'/'.ltrim($path, '/');
    }
}
