<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ExternalAuthController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => false,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        $endpoint = config('services.rs.v1.endpoint').'sessions';

        try {
            // Call external API
            $response = Http::timeout(10)->post($endpoint, $request->only('email', 'password'));

            if (! $response->successful()) {
                return back()->withErrors(['email' => 'Invalid credentials']);
            }

            $data = $response->json();

            // Prefer the last matching cookie: the jar can contain more than one
            // `Authorization` entry, and only the most recent carries a usable expiry.
            $sessionCookie = collect($response->cookies()->toArray())
                ->where('Name', 'Authorization')
                ->last();

            $authCookie = $sessionCookie['Value'] ?? null;

            $expiresCookie = $sessionCookie['Expires'] ?? null;

            if (! $authCookie) {
                Log::error('Missing Authorization cookie in API response.', [
                    'status' => $response->status(),
                ]);

                return back()->withErrors(['email' => 'Missing auth cookie from external API']);
            }

            // Store in session
            session(['external_auth_cookie' => $authCookie]);
            session(['external_auth_expires' => $expiresCookie]);

            // Create or update local user for Sanctum session
            $username = $data['username'] ?? null;
            if (! $username) {
                Log::error('Missing username in API response.', [
                    'status' => $response->status(),
                ]);

                return back()->withErrors(['email' => 'Invalid API response: missing username']);
            }

            $user = User::updateOrCreate(
                ['email' => $request->email],
                [
                    'name' => $username,
                    'password' => Hash::make(Str::random(32).time()), // Add time for uniqueness
                ]
            );

            Auth::login($user);

            return redirect()->intended('/dashboard');

        } catch (ConnectionException $e) {
            Log::error('API connection error during login.', [
                'exception' => $e->getMessage(),
            ]);

            return back()->withErrors(['email' => 'API Connection Error. Please try again later.']);
        } catch (RequestException $e) {
            Log::error('API request error during login.', [
                'status' => $e->response?->status(),
                'exception' => $e->getMessage(),
            ]);

            return back()->withErrors(['email' => 'An error occurred while authenticating with the API.']);
        } catch (\Exception $e) {
            Log::error('Unexpected error during login.', [
                'exception' => $e->getMessage(),
            ]);

            return back()->withErrors(['email' => 'An unexpected error occurred. Please try again.']);
        }
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
