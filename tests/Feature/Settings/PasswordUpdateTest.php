<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the password settings screen. Passwords live in the external RSBE
 * system, so the controller delegates to ExternalApiService rather than
 * hashing anything locally.
 */
class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAuthenticatedUser(): self
    {
        $this->actingAs(User::factory()->create())
            ->withSession(['external_auth_expires' => now()->addHour()->timestamp]);

        return $this;
    }

    public function test_password_page_is_displayed(): void
    {
        $this->actingAsAuthenticatedUser()
            ->get('/settings/password')
            ->assertOk();
    }

    public function test_password_can_be_updated(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('updateUserPassword')->once()->andReturn(['status' => 'ok']);
        });

        $response = $this->actingAsAuthenticatedUser()
            ->from('/settings/password')
            ->patch('/settings/password', [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response->assertSessionHasNoErrors()
            ->assertRedirect('/settings/password')
            ->assertSessionHas('success');
    }

    public function test_an_external_api_error_is_surfaced_on_the_current_password_field(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('updateUserPassword')->once()->andReturn(['error' => 'Incorrect password.']);
        });

        $response = $this->actingAsAuthenticatedUser()
            ->from('/settings/password')
            ->patch('/settings/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response->assertSessionHasErrors('current_password')
            ->assertRedirect('/settings/password');
    }

    public function test_new_password_must_be_confirmed(): void
    {
        $response = $this->actingAsAuthenticatedUser()
            ->from('/settings/password')
            ->patch('/settings/password', [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'does-not-match',
            ]);

        $response->assertSessionHasErrors('password')
            ->assertRedirect('/settings/password');
    }

    public function test_all_password_fields_are_required(): void
    {
        $response = $this->actingAsAuthenticatedUser()
            ->from('/settings/password')
            ->patch('/settings/password', []);

        $response->assertSessionHasErrors(['current_password', 'password', 'password_confirmation']);
    }
}
