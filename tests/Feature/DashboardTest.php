<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers dashboard access, which is gated by both the `auth` guard and the
 * `check.external.expiration` middleware that validates the RSBE session.
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_with_a_live_external_session_can_visit_the_dashboard(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('getPartners')->once()->andReturn([]);
        });

        $this->actingAs(User::factory()->create())
            ->withSession(['external_auth_expires' => now()->addHour()->timestamp])
            ->get('/dashboard')
            ->assertOk();
    }

    public function test_users_with_an_expired_external_session_are_redirected_to_login(): void
    {
        $this->actingAs(User::factory()->create())
            ->withSession(['external_auth_expires' => now()->subHour()->timestamp])
            ->get('/dashboard')
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_users_without_an_external_expiration_are_redirected_to_login(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/dashboard')
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }
}
