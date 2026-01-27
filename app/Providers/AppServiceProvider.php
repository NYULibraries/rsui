<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Client\Events\ResponseReceived;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Class AppServiceProvider
 * This provider handles the global bootstrapping of application services,
 * including API resource formatting and local development debugging tools.
 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        /**
         * Conditional loading of Laravel Telescope for local development.
         * Telescope provides a powerful UI for monitoring requests, exceptions, and queries.
         */
        if ($this->app->environment('local') && class_exists(\Laravel\Telescope\TelescopeServiceProvider::class)) {
            $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
            $this->app->register(TelescopeServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /**
         * 1. Data Transformation Configuration
         *
         * By default, Laravel wraps Resource Collections in a 'data' key.
         * We disable this global wrapping to flatten the JSON structure, allowing
         * Inertia/React components to map over results directly (e.g., results.map()).
         */
        JsonResource::withoutWrapping();

        /**
         * 2. Local Environment HTTP Logging & Security Masking
         *
         * This listener captures every HTTP client response in the local environment.
         * It automatically sanitizes sensitive headers to prevent credentials
         * (cookies/tokens) from being written to plain-text log files.
         */
        if ($this->app->environment('local')) {
            Event::listen(ResponseReceived::class, function (ResponseReceived $event) {

                // List of header keys that contain sensitive authentication data
                $sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-csrf-token', 'php-auth-pw'];

                // Sanitize Request Headers: Replace sensitive values with [MASKED]
                $safeRequestHeaders = collect($event->request->headers())
                    ->mapWithKeys(fn($value, $key) => [
                        $key => in_array(strtolower($key), $sensitiveHeaders) ? ['[MASKED]'] : $value
                    ])->toArray();

                // Sanitize Response Headers: Mask potential session-setting headers
                $safeResponseHeaders = collect($event->response->headers())
                    ->mapWithKeys(fn($value, $key) => [
                        $key => in_array(strtolower($key), $sensitiveHeaders) ? ['[MASKED]'] : $value
                    ])->toArray();

                Log::info('External API Response Received:', [
                    'url'              => (string) $event->request->url(),
                    'method'           => $event->request->method(),
                    'status'           => $event->response->status(),
                    'request_headers'  => $safeRequestHeaders,
                    'response_headers' => $safeResponseHeaders,
                    // Attempt to log JSON if available, otherwise fallback to raw body
                    'response_body'    => $event->response->json() ?? $event->response->body(),
                ]);
            });
        }
    }
}
