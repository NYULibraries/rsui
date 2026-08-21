<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards routes that depend on a live external RSBE session.
 *
 * Laravel's own session only proves that a local `User` record was created during
 * login; it does not guarantee the upstream RSBE session is still valid. This
 * middleware reads two session keys written by `ExternalAuthController::login()`:
 *
 * - `external_auth_cookie` — the RSBE `Authorization` cookie value forwarded on every
 *   subsequent `ExternalApiService`/`ExternalApiClient` request.
 * - `external_auth_expires` — the Unix timestamp (from the RSBE cookie's `Expires`
 *   attribute) after which that cookie is no longer valid.
 *
 * If `external_auth_expires` is missing or in the past, the local Laravel session is
 * logged out and invalidated (not just the external one), and the user is redirected
 * to `login` with a flash error. This keeps the two sessions in lock-step: a request
 * can never reach a controller with a local session but a stale/absent external one.
 */
class CheckExternalAuthExpiration
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check if the user is authenticated with Laravel's session
        if (! Auth::check()) {
            // If not authenticated via Laravel, the 'auth' middleware should catch this
            // but it's good to have an explicit check.
            return redirect()->route('login');
        }

        // 2. Check for the external_auth_expires in the session
        $externalAuthExpires = session('external_auth_expires');

        // If the expiration timestamp is not found or is in the past
        if (! $externalAuthExpires || now()->timestamp >= $externalAuthExpires) {

            Auth::logout();

            $request->session()->invalidate();

            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Your external session has expired. Please log in again.');

        }

        return $next($request);
    }
}
