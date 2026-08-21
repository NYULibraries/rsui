<?php

use App\Http\Middleware\CheckExternalAuthExpiration;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Middleware\TrustProxies;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        $middleware->alias([
            'check.external.expiration' => CheckExternalAuthExpiration::class,
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->throttleApi();

        $middleware->replace(TrustProxies::class, App\Http\Middleware\TrustProxies::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (Response $response) {
            $status = $response->getStatusCode();
            $renderableStatuses = [403, 404, 419, 500, 502, 503];

            if (! in_array($status, $renderableStatuses, true) || request()->expectsJson()) {
                return $response;
            }

            return Inertia::render('errors/Error', [
                'status' => $status,
            ])->toResponse(request())->setStatusCode($status);
        });
    })->create();
