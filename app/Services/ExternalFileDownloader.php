<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
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
                Log::info("External request Url: {$externalRequestUrl}", ['range_requested' => $range]);
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
            $rangeStart = null;
            $rangeEnd = null;

            if ($range && preg_match('/^bytes=(\d+)-(\d*)$/', $range, $rangeMatches)) {
                $rangeStart = (int) $rangeMatches[1];
                $rangeEnd = $rangeMatches[2] !== '' ? (int) $rangeMatches[2] : null;
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

            // Some origins ignore the Range header and always return the full file
            // with a 200. If we simply relayed that, the browser (which is expecting
            // a 206 slice starting at the seeked byte) gets confused: it repeatedly
            // aborts the still-downloading full-file response every time the user
            // seeks again, and playback never resumes ("aborted by the user agent").
            // When that happens we emulate a real 206 ourselves: fabricate the
            // Content-Range/Content-Length for the requested slice, and drop/stop
            // streaming bytes outside of it as they arrive from the origin.
            $emulateRange = false;
            $originContentLength = null;

            curl_setopt($handle, CURLOPT_HEADERFUNCTION, function ($curl, $header) use ($range, $rangeStart, &$emulateRange, &$originContentLength): int {
                $length = strlen($header);
                $trimmed = trim($header);

                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $trimmed, $matches)) {
                    $status = (int) $matches[1];
                    $emulateRange = $rangeStart !== null && $status === 200;

                    if (! headers_sent()) {
                        // Symfony's StreamedResponse already emitted the initial "HTTP/1.1 200 OK"
                        // status line via header() before invoking this callback, so
                        // http_response_code() can no longer change it (PHP only honors the first
                        // header()-set status line). Overriding with an explicit status-line
                        // header() call works regardless of that ordering.
                        $code = $emulateRange ? 206 : $status;
                        $text = Response::$statusTexts[$code] ?? '';
                        header("HTTP/1.1 {$code} {$text}");
                    }

                    if (App::isLocal()) {
                        // Logs whether the origin actually honored a Range request
                        // (206) or ignored it and sent the whole file back (200),
                        // which is the usual cause of "seeking backward works,
                        // seeking forward doesn't": the browser assumes ranges are
                        // supported after a 206, but a 200 forces a full re-fetch.
                        Log::info('External download response status', [
                            'range_requested' => $range,
                            'status' => $status,
                            'emulating_range' => $emulateRange,
                        ]);
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

                if ($name === 'content-length') {
                    $originContentLength = (int) $value;
                }

                if (App::isLocal() && in_array($name, ['content-range', 'accept-ranges', 'content-length'], true)) {
                    Log::info("External download response header: {$name}: {$value}");
                }

                if ($name === 'content-type' && (str_starts_with($value, 'audio/') || str_starts_with($value, 'video/'))) {
                    // Play media inline instead of forcing a "Save As" prompt.
                    header('Content-Disposition: inline');
                }

                // While emulating, content-length/content-range describe the
                // origin's full-file response, not our fabricated slice, so they're
                // recomputed and sent once the slice's end is known (see below).
                $forwardable = $emulateRange
                    ? ['content-type']
                    : ['content-type', 'content-length', 'content-range', 'accept-ranges'];

                if (in_array($name, $forwardable, true)) {
                    header("{$name}: {$value}");
                }

                return $length;
            });

            return new StreamedResponse(function () use ($handle, &$rangeStart, &$rangeEnd, &$emulateRange, &$originContentLength): void {
                // Bytes already consumed from the origin's stream so far, used to
                // locate the requested slice's boundaries within incoming chunks
                // while emulating Range support.
                $bytesSeen = 0;
                $headersFinalized = false;

                curl_setopt($handle, CURLOPT_WRITEFUNCTION, function ($curl, $chunk) use (&$bytesSeen, &$headersFinalized, &$rangeStart, &$rangeEnd, &$emulateRange, &$originContentLength): int {
                    $chunkLength = strlen($chunk);

                    if (! $emulateRange) {
                        echo $chunk;
                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();

                        return $chunkLength;
                    }

                    // Only once the origin's real Content-Length is known can we
                    // compute the fabricated slice's end and total, and emit the
                    // Content-Range/Content-Length headers for it (still before any
                    // body bytes have been echoed).
                    if (! $headersFinalized) {
                        if ($originContentLength === null) {
                            // No Content-Length to build a valid Content-Range from;
                            // fall back to relaying the origin's response as-is.
                            $emulateRange = false;
                            echo $chunk;
                            if (ob_get_level() > 0) {
                                ob_flush();
                            }
                            flush();

                            return $chunkLength;
                        }

                        $rangeEnd ??= $originContentLength - 1;
                        $rangeEnd = min($rangeEnd, $originContentLength - 1);

                        if (! headers_sent()) {
                            header("Content-Range: bytes {$rangeStart}-{$rangeEnd}/{$originContentLength}");
                            header('Content-Length: '.($rangeEnd - $rangeStart + 1));
                            header('Accept-Ranges: bytes');
                        }

                        $headersFinalized = true;
                    }

                    $chunkStart = $bytesSeen;
                    $chunkEnd = $bytesSeen + $chunkLength - 1;
                    $bytesSeen += $chunkLength;

                    // Chunk entirely before the requested slice: skip it, but tell
                    // curl to keep going by reporting the full chunk as consumed.
                    if ($chunkEnd < $rangeStart) {
                        return $chunkLength;
                    }

                    $sliceStart = max(0, $rangeStart - $chunkStart);
                    $sliceEnd = min($chunkLength - 1, $rangeEnd - $chunkStart);

                    if ($sliceStart <= $sliceEnd) {
                        echo substr($chunk, $sliceStart, $sliceEnd - $sliceStart + 1);
                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                    }

                    // Once we've delivered through the end of the requested slice,
                    // stop the transfer early instead of waiting for the origin to
                    // send the rest of the file. Returning a value that doesn't
                    // match $chunkLength tells curl to abort with CURLE_WRITE_ERROR,
                    // which is expected/handled below.
                    if ($chunkEnd >= $rangeEnd) {
                        return $sliceEnd - $sliceStart + 1;
                    }

                    return $chunkLength;
                });

                curl_exec($handle);

                // CURLE_WRITE_ERROR (23) here just means we intentionally stopped
                // the origin transfer early once the requested slice was delivered.
                if (curl_errno($handle) && curl_errno($handle) !== CURLE_WRITE_ERROR) {
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
