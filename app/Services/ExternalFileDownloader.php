<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalFileDownloader
{
    public function __construct(private readonly ExternalApiClient $client) {}

    public function download(string $path): StreamedResponse
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
            $handle = curl_init();
            curl_setopt($handle, CURLOPT_URL, $externalRequestUrl);
            curl_setopt($handle, CURLOPT_RETURNTRANSFER, false);
            curl_setopt($handle, CURLOPT_HEADER, false);
            curl_setopt($handle, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($handle, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($handle, CURLOPT_TIMEOUT, 3600);
            curl_setopt($handle, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($handle, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($handle, CURLOPT_HTTPHEADER, [
                'Accept-Encoding: gzip, deflate, br',
                'Connection: keep-alive',
                'User-Agent: RSUI/'.config('app.version').' (dlts@nyu.edu)',
                'Accept: */*',
                "Cookie: Authorization={$cookie}",
            ]);
            curl_setopt($handle, CURLOPT_HEADERFUNCTION, function ($curl, $header): int {
                $length = strlen($header);
                $parts = explode(':', $header, 2);

                if (count($parts) < 2) {
                    return $length;
                }

                $name = strtolower(trim($parts[0]));
                $value = trim($parts[1]);

                if (! headers_sent() && $value !== '' && in_array($name, ['content-type', 'content-length'], true)) {
                    header("{$name}: {$value}");
                }

                return $length;
            });

            return new StreamedResponse(function () use ($handle): void {
                curl_exec($handle);

                if (curl_errno($handle)) {
                    Log::error('cURL error during streaming: '.curl_error($handle));
                }

                curl_close($handle);
            }, 200, [
                'Content-Type' => 'application/octet-stream',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'Expires' => '0',
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
