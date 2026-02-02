<?php

test('search pagination parameters are passed to external API', function () {
    // Mock the ExternalApiService to verify parameters
    $mockService = Mockery::mock(\App\Services\ExternalApiService::class);
    $mockService->shouldReceive('search')
        ->once()
        ->with('test term', [
            'rows' => 10,
            'start' => 10,  // Second page (page 2, 10 rows per page)
        ])
        ->andReturn(new \App\Http\Resources\ExternalSearchCollection(collect(), []));

    $controller = new \App\Http\Controllers\SearchController($mockService);

    // Mock a request with page=2
    $request = new \Illuminate\Http\Request(['term' => 'test term', 'page' => 2]);

    $response = $controller->index($request);

    // Should return Inertia response
    $this->assertInstanceOf(\Inertia\Response::class, $response);
});

test('search first page uses start=0', function () {
    $mockService = Mockery::mock(\App\Services\ExternalApiService::class);
    $mockService->shouldReceive('search')
        ->once()
        ->with('test term', [
            'rows' => 10,
            'start' => 0,  // First page
        ])
        ->andReturn(new \App\Http\Resources\ExternalSearchCollection(collect(), []));

    $controller = new \App\Http\Controllers\SearchController($mockService);

    // Mock a request with page=1 (default)
    $request = new \Illuminate\Http\Request(['term' => 'test term']);

    $response = $controller->index($request);

    $this->assertInstanceOf(\Inertia\Response::class, $response);
});
