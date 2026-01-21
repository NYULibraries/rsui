<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CollectionController;
use App\Services\ExternalApiService;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\PartnersController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ExternalAuthController;
use App\Http\Controllers\FilePreviewController;
use App\Http\Controllers\SearchController;

use Inertia\Inertia;

Route::middleware(['auth', 'check.external.expiration'])->group(function () {

    // List partners
    Route::get('dashboard', [PartnersController::class, 'index'])
        ->name('dashboard');

    // Show partner by id
    Route::get('partners/{partner}', [PartnersController::class, 'show'])
        ->name('partner.show')
        ->whereUuid('partner');

    // Show collection by id
    Route::get('collections/{collection}', [CollectionController::class, 'show'])
        ->name('collection.show')
        ->whereUuid('collection');

    // Show collection + files from path
    Route::get('/paths/{partner}/{collection}', [CollectionController::class, 'path'])->name('collections.wihtoutpath');

    Route::get('/paths/{partner}/{collection}/{path}', [CollectionController::class, 'path'])->where('path', '.*')->name('collections.path');

    Route::get('/download/{path}', [ExternalApiService::class, 'downloadFile'])->where('path', '.*');

    Route::get('/preview/{path}', [FilePreviewController::class, 'show'])->where('path', '.*')->name('file.preview');

    // List files from path
    Route::get('/fs/{path}', [ExternalApiService::class, 'getPath'])->where('path', '.*');

    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', function () {
        return Inertia::render('settings/password');
    })->name('settings.password');

    Route::patch('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    Route::get('ping', [ExternalApiService::class, 'ping'])->name('ping');

    // Search routes
    Route::get('search', [SearchController::class, 'index'])->name('search');

    Route::get('api/search/autocomplete', [SearchController::class, 'autocomplete'])->name('search.autocomplete');

});

Route::middleware('guest')->group(function () {

    Route::get('/', [WelcomeController::class, 'index'])
	  ->name('home');

     Route::get('login', [ExternalAuthController::class, 'create'])
        ->name('login');

    Route::post('login', [ExternalAuthController::class, 'login'])
        ->name('login.post');

});


