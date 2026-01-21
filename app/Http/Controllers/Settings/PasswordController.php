<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\ExternalApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    protected $externalApiService;

    public function __construct(ExternalApiService $externalApiService)
    {
        $this->externalApiService = $externalApiService;
    }

    public function edit(): Response
    {
        return Inertia::render('settings/password');
    }

    public function update(Request $request): RedirectResponse
    {
        $validatedData = $request->validate([
            'current_password' => 'required',
            'password' => 'required|confirmed',
            'password_confirmation' => 'required',
        ]);

        try {
            $response = $this->externalApiService->updateUserPassword($validatedData);

            if ($response && !isset($response['error'])) {
                return back()->with('success', 'Password updated successfully.');
            } else {
                $errorMessage = $response['error'] ?? 'The provided password does not match your current password.';
                return back()->withErrors(['current_password' => $errorMessage]);
            }
        } catch (\Exception $e) {
            Log::error('Error updating password: ' . $e->getMessage());
            return back()->with('error', 'An error occurred while updating your password.');
        }
    }
}
