<?php

namespace App\Services;

use App\Exceptions\ExternalAuthSessionExpiredException;
use Exception;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalApiClient
{
    private string $endpoint;

    public function __construct()
    {
        $this->endpoint = rtrim((string) config('services.rs.v1.endpoint'), '/');
    }

    public function request(string $method, string $path, array $options = []): ?Response
    {
        try {
            $this->validateSession();

            $cookie = session('external_auth_cookie');

            if (! $cookie) {
                throw new Exception('External authentication cookie missing.');
            }

            $domain = parse_url($this->endpoint, PHP_URL_HOST);
            $response = Http::baseUrl($this->endpoint)
                ->withCookies(['Authorization' => $cookie], $domain)
                ->withHeaders([
                    'User-Agent' => 'RSUI/'.config('app.version').' (dlts@nyu.edu)',
                    'Accept' => 'application/json',
                ])
                ->timeout(10)
                ->send($method, $path, $options);

            $response->throw();
            $this->refreshSessionCookie($response);

            return $response;
        } catch (Exception $exception) {
            Log::error('External API request failed.', [
                'method' => $method,
                'path' => $path,
                'exception' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function endpoint(): string
    {
        return $this->endpoint;
    }

    public function validateSession(): void
    {
        $expires = session('external_auth_expires');

        if (! $expires || now()->timestamp > $expires) {
            throw new ExternalAuthSessionExpiredException('External session has expired.');
        }
    }

    private function refreshSessionCookie(Response $response): void
    {
        $cookie = collect($response->cookies()->toArray())
            ->where('Name', 'Authorization')
            ->last();

        $authCookie = $cookie['Value'] ?? null;

        if (! $authCookie) {
            return;
        }

        session(['external_auth_cookie' => $authCookie]);

        if (! empty($cookie['Expires'])) {
            session(['external_auth_expires' => $cookie['Expires']]);
        }
    }
}
