<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitWorkflowRequest;
use App\Services\ExternalApiService;
use Illuminate\Http\JsonResponse;

class WorkflowController extends Controller
{
    public function __construct(private readonly ExternalApiService $externalApiService) {}

    /**
     * Submit a workflow job to the external RS API and return the result as JSON.
     */
    public function submit(SubmitWorkflowRequest $request): JsonResponse
    {

        $workflow_id = $request->string('workflow_id')->toString();

        $parameters = $request->array('parameters');

        // Access nested input via dot notation and chain fluent string methods
        if ($request->has('parameters.source_path')) {
            $parameters['source_path'] = $request->string('parameters.source_path')
                ->replace('/fs', '') // fs is part of our route, not the backend API.
                ->toString();
        }

        $result = $this->externalApiService->submitWorkflow($workflow_id, $parameters);

        if ($result === null) {
            return response()->json(['message' => 'Failed to submit workflow. Please try again.'], 502);
        }

        return response()->json([
            'message' => 'Workflow submitted successfully.',
            'data' => $result,
        ]);
    }
}
