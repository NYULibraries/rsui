<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class FilePreviewController extends Controller
{
    public function show(string $path): Response
    {
        return Inertia::render('FilePreviewer', [
            'item' => [
                'download_url' => '/download/'.$path,
                'name' => basename($path),
            ],
        ]);
    }
}
