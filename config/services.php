<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */
    'rs' => [
        // deprecated v0 API credentials
        // 'v0' => [
        //     'endpoint' => env('RS_V0_ENDPOINT'),
        //     'username' => env('RS_V0_USERNAME'),
        //     'password' => env('RS_V0_PASSWORD'),
        // ],
        'v1' => [
            'endpoint' => env('RS_V1_ENDPOINT'),
        ]
    ],

];
