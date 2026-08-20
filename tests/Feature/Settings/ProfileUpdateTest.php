<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Services\ExternalApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the profile settings screen. Name changes are pushed to the external
 * RSBE API before being persisted locally, and account deletion still requires
 * the current password.
 */
class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(User $user): self
    {
        $this->actingAs($user)
            ->withSession(['external_auth_expires' => now()->addHour()->timestamp]);

        return $this;
    }

    public function test_profile_page_is_displayed(): void
    {
        $this->actingAsUser(User::factory()->create())
            ->get('/settings/profile')
            ->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('updateUserName')->once()->andReturn(['status' => 'ok']);
        });

        $user = User::factory()->create();

        $response = $this->actingAsUser($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('updateUserName')->once()->andReturn(['status' => 'ok']);
        });

        $user = User::factory()->create();

        $response = $this->actingAsUser($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_profile_is_not_updated_when_the_external_api_fails(): void
    {
        $this->mock(ExternalApiService::class, function ($mock) {
            $mock->shouldReceive('updateUserName')->once()->andThrow(new \Exception('API down'));
        });

        $user = User::factory()->create();
        $originalName = $user->name;

        $response = $this->actingAsUser($user)
            ->from('/settings/profile')
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response->assertSessionHasErrors('name');

        $this->assertSame($originalName, $user->refresh()->name);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)
            ->delete('/settings/profile', [
                'password' => 'password',
            ]);

        $response->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAsUser($user)
            ->from('/settings/profile')
            ->delete('/settings/profile', [
                'password' => 'wrong-password',
            ]);

        $response->assertSessionHasErrors('password')
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->fresh());
    }
}
