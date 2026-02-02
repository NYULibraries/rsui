<?php

test('search controller methods exist', function () {
    $controller = new \App\Http\Controllers\SearchController(app(\App\Services\ExternalApiService::class));

    // Test that the index method exists
    $this->assertTrue(method_exists($controller, 'index'));

    // Test that the apisearch method exists
    $this->assertTrue(method_exists($controller, 'apisearch'));

    // Test that the autocomplete method exists
    $this->assertTrue(method_exists($controller, 'autocomplete'));
});
