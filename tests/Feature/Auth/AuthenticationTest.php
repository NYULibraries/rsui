<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Covers the external (RSBE) authentication flow.
 *
 * This application does not use Laravel's local credential check. Logging in
 * proxies the credentials to the external API, stores the returned
 * Authorization cookie in the session, and mirrors the account into the local
 * users table so the session guard has a user to attach to.
 */
class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function endpoint(): string
    {
        return config('services.rs.v1.endpoint').'sessions';
    }

    /**
     * Build a fake successful RSBE session response including the
     * Authorization cookie the controller requires.
     */
    private function fakeSuccessfulExternalLogin(string $username = 'external-user', ?int $expires = null): void
    {
        $expires ??= now()->addHour()->timestamp;

        Http::fake([
            $this->endpoint() => Http::response(
                ['username' => $username],
                200,
                ['Set-Cookie' => 'Authorization=external-token; Expires='.$expires],
            ),
        ]);
    }

    public function test_login_screen_can_be_rendered(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_users_can_authenticate_using_the_external_api(): void
    {
        $this->fakeSuccessfulExternalLogin('jdoe');

        $response = $this->post('/login', [
            'email' => 'jdoe@example.com',
            'password' => 'password',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'email' => 'jdoe@example.com',
            'name' => 'jdoe',
        ]);
    }

    public function test_successful_login_stores_the_external_auth_cookie_in_the_session(): void
    {
        $this->fakeSuccessfulExternalLogin();

        $this->post('/login', [
            'email' => 'user@example.com',
            'password' => 'password',
        ]);

        $this->assertNotNull(session('external_auth_cookie'));
        $this->assertNotNull(session('external_auth_expires'));
    }

    public function test_users_can_not_authenticate_when_the_external_api_rejects_the_credentials(): void
    {
        Http::fake([
            $this->endpoint() => Http::response(['error' => 'unauthorized'], 401),
        ]);

        $response = $this->from('/login')->post('/login', [
            'email' => 'jdoe@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_login_fails_when_the_external_api_omits_the_authorization_cookie(): void
    {
        Http::fake([
            $this->endpoint() => Http::response(['username' => 'jdoe'], 200),
        ]);

        $response = $this->from('/login')->post('/login', [
            'email' => 'jdoe@example.com',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_login_requires_an_email_and_password(): void
    {
        $response = $this->from('/login')->post('/login', [
            'email' => '',
            'password' => '',
        ]);

        $response->assertSessionHasErrors(['email', 'password']);
        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withSession(['external_auth_expires' => now()->addHour()->timestamp])
            ->post('/logout');

        $response->assertRedirect('/');
        $this->assertGuest();
    }
}
