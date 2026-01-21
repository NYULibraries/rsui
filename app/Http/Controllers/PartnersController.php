<?php

namespace App\Http\Controllers;

use App\Services\ExternalApiService;
use Illuminate\Support\Facades\Log;
use Exception;
use Inertia\Inertia;
use Inertia\Response;

class PartnersController extends Controller
{

    protected $externalApiService;

    public function __construct(ExternalApiService $externalApiService)
    {
        $this->externalApiService = $externalApiService;
    }

    public function index(): Response
    {
        try {
            $partners = $this->externalApiService->getPartners();

            if ($partners === null) {
                throw new Exception('Failed to fetch partners from external API');
            }

            return Inertia::render('partners/Index', [ 'partners' => $partners, ]);

        } catch (Exception $e) {
            Log::error('Error fetching partners: ' . $e->getMessage());
            return Inertia::render('partners/Index', [
                'partners' => [],
                'error' => 'Failed to load partners. Please try again later.'
            ]);
        }
    }

    public function show(string $id): Response
    {
        try {
            $partner = $this->externalApiService->getPartnerById($id);

            if (!$partner) {
                throw new Exception('Partner not found');
            }

            return Inertia::render('partner/Index', [ 'partner' => $partner, ]);

        } catch (Exception $e) {
            Log::error('Error fetching partner: ' . $e->getMessage());
            return Inertia::render('partner/Index', [
                'partner' => null,
                'error' => 'Failed to load partner. Please try again later.'
            ]);
        }
    }

}